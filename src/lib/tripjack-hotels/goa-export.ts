import "server-only";

import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import {
  enrichCatalogEntryLocation,
  entryBrowseCityKey,
  formatFeaturedCardLocation,
  resolveHotelDisplayLocation,
} from "@/lib/tripjack-hotels/catalog-location";
import { listBrowsableIndiaHotelsPage } from "@/lib/tripjack-hotels/catalog-firestore";
import { catalogEntryImageUrls } from "@/lib/tripjack-hotels/hotel-images";
import { isIndiaTripJackCatalogHotel } from "@/lib/tripjack-hotels/india-catalog";
import {
  getTripJackHotelPriceCache,
  saveTripJackHotelPriceCache,
  type TripJackHotelPriceCacheRecord,
} from "@/lib/tripjack-hotels/price-cache";
import {
  MAX_HOTEL_CONTENT_BATCH,
  type TripJackHotelCatalogEntry,
} from "@/lib/tripjack-hotels/catalog-types";
import type { NormalizedHotelDetail, NormalizedHotelOption } from "@/lib/tripjack-hotels/types";
import { fetchTripJackHotelPricing } from "@/lib/tripjack-hotels/client";
import {
  catalogEntryToEnrichment,
  decodeHotelText,
} from "@/lib/tripjack-hotels/detail-content";
import {
  extractHotelContentPayload,
  normalizeStaticHotelRecord,
} from "@/lib/tripjack-hotels/normalize-static";
import { fetchTripJackHotelContent } from "@/lib/tripjack-hotels/static-client";
import {
  DEFAULT_HOTEL_CURRENCY,
  DEFAULT_HOTEL_NATIONALITY,
} from "@/lib/tripjack-hotels/config";
import { getDefaultHotelStayDates } from "@/lib/tripjack-hotels/stay-dates";

/** Shared catalog for Bookscubagoa (and other sites) — Goa TripJack hotels only. */
export const GOA_HOTELS_COLLECTION = "goaHotels";

export interface GoaHotelRoomSnapshot {
  id: string;
  name: string;
  type: string;
  mealBasis: string;
  mealBasisLabel: string;
  pricePerNight: number;
  totalPrice: number;
  basePrice: number;
  taxes: number;
  currency: string;
  maxGuests: number;
  available: boolean;
  isRefundable: boolean;
  inclusions: string[];
  images: string[];
}

export interface GoaHotelDocument {
  id: string;
  tjHotelId: number;
  name: string;
  slug: string;
  cityName: string;
  cityKey: "goa";
  locality?: string;
  location: string;
  address: string;
  description: string;
  facilities: string[];
  policies: string[];
  starRating: number | null;
  propertyType?: string;
  contact?: string;
  geolocation?: { lat?: number; lng?: number };
  heroImage?: string;
  imageUrls: string[];
  images: string[];
  priceFrom: number;
  currency: string;
  rooms: GoaHotelRoomSnapshot[];
  /** Snapshot stay used for room totals (live enrich). */
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  lastPricedAt?: string;
  contentSynced: boolean;
  websiteVisible: boolean;
  isDeleted: boolean;
  source: "tripjack";
  sharedFor: "bookscubagoa";
  updatedAt: string;
}

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "hotel"
  );
}

function nightsBetween(checkIn?: string, checkOut?: string): number {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(`${checkIn}T12:00:00`).getTime();
  const end = new Date(`${checkOut}T12:00:00`).getTime();
  const nights = Math.round((end - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, nights);
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const rec = item as Record<string, unknown>;
        for (const key of ["name", "label", "description", "text", "title", "policy"]) {
          const v = rec[key];
          if (typeof v === "string" && v.trim()) return v.trim();
        }
      }
      return "";
    })
    .filter(Boolean);
}

function firstNonEmpty(...values: Array<string | undefined | null>): string {
  for (const value of values) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text) return text;
  }
  return "";
}

function needsStaticContent(entry: TripJackHotelCatalogEntry): boolean {
  return !entry.description?.trim() || !entry.address?.trim() || !(entry.facilities?.length > 0);
}

function mergeCatalogEntries(
  base: TripJackHotelCatalogEntry,
  fresh: TripJackHotelCatalogEntry
): TripJackHotelCatalogEntry {
  return enrichCatalogEntryLocation({
    ...base,
    ...fresh,
    name: fresh.name || base.name,
    address: firstNonEmpty(fresh.address, base.address),
    description: firstNonEmpty(fresh.description, base.description) || undefined,
    facilities:
      fresh.facilities?.length > 0 ? fresh.facilities : base.facilities?.length ? base.facilities : [],
    policies:
      fresh.policies && fresh.policies.length > 0
        ? fresh.policies
        : base.policies && base.policies.length > 0
          ? base.policies
          : undefined,
    imageUrls: fresh.imageUrls?.length ? fresh.imageUrls : base.imageUrls,
    heroImage: fresh.heroImage || base.heroImage,
    images: fresh.images?.length ? fresh.images : base.images,
    contact: firstNonEmpty(fresh.contact, base.contact) || undefined,
    propertyType: firstNonEmpty(fresh.propertyType, base.propertyType) || undefined,
    locality: firstNonEmpty(fresh.locality, base.locality) || undefined,
    area: firstNonEmpty(fresh.area, base.area) || undefined,
    starRating: fresh.starRating ?? fresh.rating ?? base.starRating ?? base.rating ?? null,
    rating: fresh.rating ?? base.rating ?? null,
    geolocation: fresh.geolocation ?? base.geolocation,
    contentSynced: true,
    lastPriceFrom: fresh.lastPriceFrom ?? base.lastPriceFrom,
    lastPricedAt: fresh.lastPricedAt ?? base.lastPricedAt,
    lastPriceCurrency: fresh.lastPriceCurrency ?? base.lastPriceCurrency,
  });
}

function mapOptionToRoom(
  option: NormalizedHotelOption,
  nights: number
): GoaHotelRoomSnapshot {
  const total = Number(option.pricing?.totalPrice) || 0;
  const perNight = nights > 0 ? Math.round((total / nights) * 100) / 100 : total;
  return {
    id: option.optionId,
    name: option.roomInfo?.[0] || option.roomName || "Room",
    type: option.roomType || option.optionType || "Room",
    mealBasis: option.mealBasis || "",
    mealBasisLabel: option.mealBasisLabel || option.mealBasis || "",
    pricePerNight: perNight,
    totalPrice: total,
    basePrice: Number(option.pricing?.basePrice) || 0,
    taxes: Number(option.pricing?.taxes) || 0,
    currency: option.pricing?.currency || "INR",
    maxGuests: 2,
    available: true,
    isRefundable: Boolean(option.isRefundable),
    inclusions: option.inclusions ?? [],
    images: option.roomImages ?? [],
  };
}

function roomsFromDetail(
  detail: NormalizedHotelDetail | undefined,
  checkIn?: string,
  checkOut?: string
): GoaHotelRoomSnapshot[] {
  if (!detail?.options?.length) return [];
  const nights = nightsBetween(checkIn || detail.checkIn, checkOut || detail.checkOut);
  return detail.options.map((opt) => mapOptionToRoom(opt, nights));
}

function buildGoaHotelDoc(
  entry: TripJackHotelCatalogEntry,
  cache: TripJackHotelPriceCacheRecord | null,
  liveDetail?: NormalizedHotelDetail | null
): GoaHotelDocument | null {
  if (entry.isDeleted || entry.websiteVisible === false) return null;
  if (!isIndiaTripJackCatalogHotel(entry)) return null;
  if (entryBrowseCityKey(entry) !== "goa") return null;

  const enriched = enrichCatalogEntryLocation(entry);
  const resolved = formatFeaturedCardLocation(enriched);
  const detail = liveDetail || cache?.detail || null;

  const imageUrls = [
    ...new Set(
      [
        ...catalogEntryImageUrls(enriched),
        ...(detail?.images ?? []),
        ...(cache?.detail?.images ?? []),
      ].filter(Boolean)
    ),
  ];

  const checkIn = liveDetail?.checkIn || cache?.checkIn;
  const checkOut = liveDetail?.checkOut || cache?.checkOut;
  const nights = nightsBetween(checkIn, checkOut);

  let rooms = roomsFromDetail(liveDetail || undefined, checkIn, checkOut);
  if (!rooms.length) {
    rooms = roomsFromDetail(cache?.detail, cache?.checkIn, cache?.checkOut);
  }
  if (!rooms.length && cache?.options?.length) {
    rooms = cache.options.map((opt) => mapOptionToRoom(opt, nights));
  }

  const priceCandidates = [
    ...rooms.map((r) => r.pricePerNight || r.totalPrice),
    Number(entry.lastPriceFrom),
    Number(cache?.priceFrom),
    Number(detail?.options?.[0]?.pricing?.totalPrice),
  ].filter((n) => Number.isFinite(n) && n > 0) as number[];

  const priceFrom = priceCandidates.length ? Math.min(...priceCandidates) : 0;

  const address = firstNonEmpty(
    enriched.address,
    detail?.address,
    cache?.detail?.address,
    resolved?.locality ? `${resolved.locality}, Goa` : "",
    "Goa"
  );

  const description = decodeHotelText(
    firstNonEmpty(enriched.description, detail?.description, cache?.detail?.description)
  );

  const facilities = (() => {
    const fromEntry = asStringList(enriched.facilities);
    if (fromEntry.length) return fromEntry;
    return asStringList(detail?.amenities ?? cache?.detail?.amenities);
  })();

  const policies = (() => {
    const fromEntry = asStringList(enriched.policies);
    if (fromEntry.length) return fromEntry;
    return asStringList(detail?.policies ?? cache?.detail?.policies);
  })();

  const now = new Date().toISOString();
  const id = `tj_${entry.tjHotelId}`;

  return {
    id,
    tjHotelId: entry.tjHotelId,
    name: firstNonEmpty(enriched.name, detail?.name, cache?.hotelName) || `Hotel ${entry.tjHotelId}`,
    slug: `${slugify(enriched.name || detail?.name || "hotel")}-${entry.tjHotelId}`,
    cityName: "Goa",
    cityKey: "goa",
    locality: enriched.locality || resolved?.locality,
    location: resolveHotelDisplayLocation(enriched) || resolved?.cityName || "Goa",
    address,
    description,
    facilities,
    policies,
    starRating: enriched.starRating ?? enriched.rating ?? detail?.starRating ?? null,
    propertyType: enriched.propertyType || detail?.propertyType,
    contact: enriched.contact || detail?.contact,
    geolocation: enriched.geolocation || detail?.geolocation,
    heroImage: enriched.heroImage || imageUrls[0],
    imageUrls,
    images: imageUrls,
    priceFrom: Number.isFinite(priceFrom) ? priceFrom : 0,
    currency:
      entry.lastPriceCurrency ||
      cache?.currency ||
      detail?.currency ||
      DEFAULT_HOTEL_CURRENCY,
    rooms,
    checkIn,
    checkOut,
    nights: rooms.length ? nights : undefined,
    lastPricedAt: liveDetail?.fetchedAt || cache?.fetchedAt || entry.lastPricedAt,
    contentSynced: Boolean(entry.contentSynced) || Boolean(description || facilities.length),
    websiteVisible: true,
    isDeleted: false,
    source: "tripjack",
    sharedFor: "bookscubagoa",
    updatedAt: now,
  };
}

async function refreshStaticContentBatch(
  entries: TripJackHotelCatalogEntry[]
): Promise<Map<number, TripJackHotelCatalogEntry>> {
  const byHid = new Map<number, TripJackHotelCatalogEntry>();
  for (const entry of entries) byHid.set(entry.tjHotelId, entry);

  const thin = entries.filter(needsStaticContent);
  for (let i = 0; i < thin.length; i += MAX_HOTEL_CONTENT_BATCH) {
    const chunk = thin.slice(i, i + MAX_HOTEL_CONTENT_BATCH);
    const hotelIds = chunk.map((e) => String(e.tjHotelId));
    try {
      const { data } = await fetchTripJackHotelContent({ hotelIds });
      const hotels = extractHotelContentPayload(data);
      for (const raw of hotels) {
        const normalized = normalizeStaticHotelRecord(raw);
        if (!normalized) continue;
        const prev = byHid.get(normalized.tjHotelId);
        byHid.set(
          normalized.tjHotelId,
          prev ? mergeCatalogEntries(prev, normalized) : normalized
        );
      }
    } catch (error) {
      console.warn(
        "[goa-export] content batch failed:",
        error instanceof Error ? error.message : error
      );
    }
  }

  return byHid;
}

async function fetchLivePricingForHotel(
  entry: TripJackHotelCatalogEntry,
  checkIn: string,
  checkOut: string
): Promise<NormalizedHotelDetail | null> {
  try {
    const result = await fetchTripJackHotelPricing({
      correlationId: `goa-export-${entry.tjHotelId}-${Date.now()}`,
      hid: String(entry.tjHotelId),
      checkIn,
      checkOut,
      rooms: [{ adults: 2 }],
      currency: DEFAULT_HOTEL_CURRENCY,
      nationality: DEFAULT_HOTEL_NATIONALITY,
      listingHotelName: entry.name,
      catalogEnrichment: catalogEntryToEnrichment(entry),
    });

    if (!result.detail.options?.length) return null;

    await saveTripJackHotelPriceCache({
      detail: result.detail,
      rooms: [{ adults: 2 }],
      currency: DEFAULT_HOTEL_CURRENCY,
      nationality: DEFAULT_HOTEL_NATIONALITY,
    }).catch(() => {
      /* non-blocking */
    });

    return result.detail;
  } catch (error) {
    console.warn(
      "[goa-export] live pricing failed for",
      entry.tjHotelId,
      error instanceof Error ? error.message : error
    );
    return null;
  }
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await worker(current);
    }
  });
  await Promise.all(runners);
}

export async function syncGoaHotelsForBookscubagoa(options?: {
  pageSize?: number;
  maxPages?: number;
  /** Fetch TripJack content for hotels missing address/description/facilities. */
  refreshContent?: boolean;
  /** Live-price hotels that have no room snapshot yet. */
  enrichLivePricing?: boolean;
  /** Cap live pricing calls per export (Vercel time limit). */
  maxLivePricing?: number;
  livePricingConcurrency?: number;
}): Promise<{
  exported: number;
  skipped: number;
  withRooms: number;
  withDescription: number;
  withAddress: number;
  contentRefreshed: number;
  livePriced: number;
  totalScanned: number;
}> {
  if (!isAdminEnvConfigured()) {
    throw new Error("Firebase Admin is not configured");
  }
  const db = await getSafeAdminDb();
  if (!db) throw new Error("Firestore unavailable");

  const pageSize = Math.min(50, Math.max(10, options?.pageSize ?? 50));
  const maxPages = Math.min(200, Math.max(1, options?.maxPages ?? 80));
  const refreshContent = options?.refreshContent !== false;
  const enrichLivePricing = options?.enrichLivePricing !== false;
  const maxLivePricing = Math.min(300, Math.max(0, options?.maxLivePricing ?? 120));
  const livePricingConcurrency = Math.min(6, Math.max(1, options?.livePricingConcurrency ?? 3));

  let page = 1;
  let skipped = 0;
  let totalScanned = 0;
  const seen = new Set<number>();
  const collected: TripJackHotelCatalogEntry[] = [];

  while (page <= maxPages) {
    const browse = await listBrowsableIndiaHotelsPage({
      page,
      pageSize,
      city: "goa",
    });
    if (!browse.entries.length) break;

    for (const entry of browse.entries) {
      if (seen.has(entry.tjHotelId)) continue;
      seen.add(entry.tjHotelId);
      totalScanned += 1;
      collected.push(entry);
    }

    if (page >= browse.totalPages) break;
    page += 1;
  }

  let contentRefreshed = 0;
  let entryByHid = new Map(collected.map((e) => [e.tjHotelId, e]));
  if (refreshContent) {
    const beforeThin = collected.filter(needsStaticContent).length;
    entryByHid = await refreshStaticContentBatch(collected);
    contentRefreshed = Math.max(
      0,
      beforeThin - [...entryByHid.values()].filter(needsStaticContent).length
    );
  }

  const stay = getDefaultHotelStayDates();
  const liveDetails = new Map<number, NormalizedHotelDetail>();
  const cacheByHid = new Map<number, TripJackHotelPriceCacheRecord | null>();
  let livePriced = 0;

  const entryList = [...entryByHid.values()];
  for (let i = 0; i < entryList.length; i += 40) {
    const chunk = entryList.slice(i, i + 40);
    const caches = await Promise.all(chunk.map((e) => getTripJackHotelPriceCache(e.tjHotelId)));
    chunk.forEach((entry, idx) => {
      cacheByHid.set(entry.tjHotelId, caches[idx]);
    });
  }

  if (enrichLivePricing && maxLivePricing > 0) {
    const needRooms = entryList
      .filter((entry) => {
        const cache = cacheByHid.get(entry.tjHotelId);
        return !cache?.options?.length && !cache?.detail?.options?.length;
      })
      .slice(0, maxLivePricing);

    await runPool(needRooms, livePricingConcurrency, async (entry) => {
      const detail = await fetchLivePricingForHotel(entry, stay.checkIn, stay.checkOut);
      if (detail?.options?.length) {
        liveDetails.set(entry.tjHotelId, detail);
        livePriced += 1;
        // Keep in-memory cache shape for build step.
        const optionTotals = detail.options
          .map((o) => Number(o.pricing?.totalPrice) || 0)
          .filter((n) => n > 0);
        cacheByHid.set(entry.tjHotelId, {
          id: `tj_${entry.tjHotelId}`,
          tjHotelId: entry.tjHotelId,
          hotelName: detail.name || entry.name,
          checkIn: detail.checkIn,
          checkOut: detail.checkOut,
          currency: detail.currency || DEFAULT_HOTEL_CURRENCY,
          nationality: DEFAULT_HOTEL_NATIONALITY,
          roomsSignature: "2a0c",
          rooms: [{ adults: 2 }],
          correlationId: detail.correlationId,
          reviewHash: detail.reviewHash,
          options: detail.options,
          detail,
          priceFrom: optionTotals.length ? Math.min(...optionTotals) : 0,
          fetchedAt: detail.fetchedAt,
          expiresAt: detail.expiresAt,
          source: "live",
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }

  const records: GoaHotelDocument[] = [];
  let withRooms = 0;
  let withDescription = 0;
  let withAddress = 0;
  let exported = 0;

  for (const entry of entryByHid.values()) {
    const cache = cacheByHid.get(entry.tjHotelId) ?? null;
    const doc = buildGoaHotelDoc(entry, cache, liveDetails.get(entry.tjHotelId) ?? null);
    if (!doc) {
      skipped += 1;
      continue;
    }
    if (doc.rooms.length > 0) withRooms += 1;
    if (doc.description.trim()) withDescription += 1;
    if (doc.address.trim() && doc.address.trim().toLowerCase() !== "goa") withAddress += 1;
    records.push(doc);
    exported += 1;
  }

  // Full replace (no merge) so stale nested maps / empty rooms cannot linger.
  for (let i = 0; i < records.length; i += 400) {
    const chunk = records.slice(i, i + 400);
    const batch = db.batch();
    for (const doc of chunk) {
      batch.set(db.collection(GOA_HOTELS_COLLECTION).doc(doc.id), sanitize(doc));
    }
    await batch.commit();
  }

  await db.doc("goaHotelsMeta/sync").set(
    sanitize({
      lastSyncedAt: new Date().toISOString(),
      exported,
      skipped,
      withRooms,
      withDescription,
      withAddress,
      contentRefreshed,
      livePriced,
      totalScanned,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      cityKey: "goa",
      sharedFor: "bookscubagoa",
    }),
    { merge: true }
  );

  return {
    exported,
    skipped,
    withRooms,
    withDescription,
    withAddress,
    contentRefreshed,
    livePriced,
    totalScanned,
  };
}
