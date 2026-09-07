import "server-only";

import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import {
  TRIPJACK_HOTEL_CATALOG_COLLECTION,
  TRIPJACK_HOTEL_PRICE_CACHE_COLLECTION,
} from "@/lib/tripjack-hotels/catalog-types";
import type { HotelRoomRequest, NormalizedHotelDetail, NormalizedHotelOption } from "@/lib/tripjack-hotels/types";

export type HotelPriceCacheSource = "live" | "cache";

export interface TripJackHotelPriceCacheRecord {
  id: string;
  tjHotelId: number;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  currency: string;
  nationality: string;
  roomsSignature: string;
  rooms: HotelRoomRequest[];
  correlationId: string;
  reviewHash: string;
  options: NormalizedHotelOption[];
  detail: NormalizedHotelDetail;
  priceFrom: number;
  fetchedAt: string;
  expiresAt: string;
  source: "live";
  updatedAt: string;
}

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function tripJackPriceCacheDocId(hid: number | string): string {
  return `tj_${hid}`;
}

export function buildRoomsSignature(rooms: HotelRoomRequest[]): string {
  return rooms
    .map((room) => {
      const adults = Math.max(1, Number(room.adults) || 1);
      const children = Math.max(0, Number(room.children) || 0);
      const ages = (room.childAge ?? []).slice(0, children).join(",");
      return `${adults}a${children}c${ages}`;
    })
    .join("|");
}

export function offlineCacheReviewHash(hid: number | string): string {
  return `offline_cache_${hid}`;
}

export function isOfflineCacheReviewHash(reviewHash: string | undefined | null): boolean {
  return Boolean(reviewHash?.startsWith("offline_cache_"));
}

export function isOfflineTripJackBookingId(bookingId: string | undefined | null): boolean {
  return Boolean(bookingId?.startsWith("OFFLINE_"));
}

/** True when we should try Firestore cache instead of failing the customer. */
export function shouldFallbackToPriceCache(error: {
  statusCode?: number;
  errorCode?: string;
  message?: string;
}): boolean {
  const code = (error.errorCode ?? "").toUpperCase();
  if (code === "SUPPLIER_UNAVAILABLE" || code.includes("TIMEOUT") || code.includes("NETWORK")) {
    return true;
  }
  const status = error.statusCode;
  if (status == null) return true;
  if (status === 408 || status === 429 || status >= 500) return true;
  const message = (error.message ?? "").toLowerCase();
  return (
    message.includes("fetch failed") ||
    message.includes("econnrefused") ||
    message.includes("etimedout") ||
    message.includes("socket hang up") ||
    message.includes("network") ||
    message.includes("proxy")
  );
}

export async function getTripJackHotelPriceCache(
  hid: number | string
): Promise<TripJackHotelPriceCacheRecord | null> {
  if (!isAdminEnvConfigured()) return null;
  const db = await getSafeAdminDb();
  if (!db) return null;

  const snap = await db
    .collection(TRIPJACK_HOTEL_PRICE_CACHE_COLLECTION)
    .doc(tripJackPriceCacheDocId(hid))
    .get();
  if (!snap.exists) return null;
  return snap.data() as TripJackHotelPriceCacheRecord;
}

export async function saveTripJackHotelPriceCache(input: {
  detail: NormalizedHotelDetail;
  rooms: HotelRoomRequest[];
  currency: string;
  nationality: string;
}): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  const db = await getSafeAdminDb();
  if (!db) return;

  const hid = Number(input.detail.hotelId);
  if (!Number.isFinite(hid) || hid <= 0) return;
  if (!input.detail.options?.length) return;

  const priceFrom = Math.min(
    ...input.detail.options.map((opt) => Number(opt.pricing?.totalPrice) || Number.POSITIVE_INFINITY)
  );
  if (!Number.isFinite(priceFrom) || priceFrom <= 0) return;

  const now = new Date().toISOString();
  const id = tripJackPriceCacheDocId(hid);
  const detailForCache: NormalizedHotelDetail = {
    ...input.detail,
    priceSource: "live",
    offlineBookingAllowed: false,
  };

  const record: TripJackHotelPriceCacheRecord = {
    id,
    tjHotelId: hid,
    hotelName: input.detail.name,
    checkIn: input.detail.checkIn,
    checkOut: input.detail.checkOut,
    currency: input.currency || input.detail.currency || "INR",
    nationality: input.nationality || input.detail.nationality || "106",
    roomsSignature: buildRoomsSignature(input.rooms),
    rooms: input.rooms,
    correlationId: input.detail.correlationId,
    reviewHash: input.detail.reviewHash,
    options: input.detail.options,
    detail: detailForCache,
    priceFrom,
    fetchedAt: input.detail.fetchedAt || now,
    expiresAt: input.detail.expiresAt || now,
    source: "live",
    updatedAt: now,
  };

  await db
    .collection(TRIPJACK_HOTEL_PRICE_CACHE_COLLECTION)
    .doc(id)
    .set(sanitize(record), { merge: true });

  await db
    .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
    .doc(id)
    .set(
      sanitize({
        lastPriceFrom: priceFrom,
        lastPricedAt: now,
        lastPriceCurrency: record.currency,
        updatedAt: now,
      }),
      { merge: true }
    );
}

/** Persist only card-level lastPriceFrom (e.g. from featured listing). */
export async function patchCatalogLastPriceFrom(input: {
  hid: number | string;
  priceFrom: number;
  currency?: string;
}): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  const priceFrom = Number(input.priceFrom);
  if (!Number.isFinite(priceFrom) || priceFrom <= 0) return;

  const db = await getSafeAdminDb();
  if (!db) return;

  const id = tripJackPriceCacheDocId(input.hid);
  const now = new Date().toISOString();
  await db
    .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
    .doc(id)
    .set(
      sanitize({
        lastPriceFrom: priceFrom,
        lastPricedAt: now,
        lastPriceCurrency: input.currency || "INR",
        updatedAt: now,
      }),
      { merge: true }
    );
}

export async function getCatalogLastPricesByHids(
  hids: Array<number | string>
): Promise<Map<string, { price: number; currency: string }>> {
  const map = new Map<string, { price: number; currency: string }>();
  if (!hids.length || !isAdminEnvConfigured()) return map;

  const db = await getSafeAdminDb();
  if (!db) return map;

  const unique = [...new Set(hids.map((h) => String(h)))];
  const refs = unique.map((hid) =>
    db.collection(TRIPJACK_HOTEL_CATALOG_COLLECTION).doc(tripJackPriceCacheDocId(hid))
  );

  // Firestore getAll supports up to ~100 refs per call in practice
  for (let i = 0; i < refs.length; i += 100) {
    const chunk = refs.slice(i, i + 100);
    const snaps = await db.getAll(...chunk);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const data = snap.data() as {
        tjHotelId?: number;
        lastPriceFrom?: number;
        lastPriceCurrency?: string;
      };
      const price = Number(data.lastPriceFrom);
      if (!Number.isFinite(price) || price <= 0) continue;
      const hid = String(data.tjHotelId ?? snap.id.replace(/^tj_/, ""));
      map.set(hid, { price, currency: data.lastPriceCurrency || "INR" });
    }
  }

  return map;
}

export function buildDetailFromPriceCache(
  cache: TripJackHotelPriceCacheRecord,
  request: {
    correlationId: string;
    checkIn: string;
    checkOut: string;
    rooms: HotelRoomRequest[];
    currency: string;
    nationality: string;
  }
): NormalizedHotelDetail {
  const hid = cache.tjHotelId;
  return {
    ...cache.detail,
    correlationId: request.correlationId || cache.correlationId,
    hotelId: hid,
    name: cache.hotelName || cache.detail.name,
    reviewHash: offlineCacheReviewHash(hid),
    checkIn: request.checkIn,
    checkOut: request.checkOut,
    currency: request.currency || cache.currency,
    nationality: request.nationality || cache.nationality,
    options: cache.options,
    priceSource: "cache",
    offlineBookingAllowed: true,
    fetchedAt: cache.fetchedAt,
    expiresAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  };
}

export function synthesizeOfflineHotelReview(input: {
  correlationId: string;
  hid: number | string;
  hotelName: string;
  option: NormalizedHotelOption;
  searchContext: {
    checkIn: string;
    checkOut: string;
    rooms: HotelRoomRequest[];
    currency: string;
    nationality: string;
  };
  reviewHash?: string;
}): import("@/lib/tripjack-hotels/types").NormalizedHotelReviewResult {
  const now = new Date().toISOString();
  const bookingId = `OFFLINE_${input.hid}_${Date.now()}`;
  return {
    correlationId: input.correlationId,
    tjHotelId: input.hid,
    hotelName: input.hotelName,
    bookingId,
    reviewHash: input.reviewHash || offlineCacheReviewHash(input.hid),
    option: input.option,
    deadlineDateTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    onHoldAllowed: false,
    statusSuccess: true,
    searchContext: input.searchContext,
    reviewedAt: now,
    rawResponse: { offline: true, source: "firestore_price_cache" },
    bookingMode: "offline_cache",
    priceSource: "cache",
  };
}
