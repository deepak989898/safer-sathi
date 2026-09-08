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
  type TripJackHotelPriceCacheRecord,
} from "@/lib/tripjack-hotels/price-cache";
import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";
import type { NormalizedHotelOption } from "@/lib/tripjack-hotels/types";

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
  heroImage?: string;
  imageUrls: string[];
  images: string[];
  priceFrom: number;
  currency: string;
  rooms: GoaHotelRoomSnapshot[];
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

function mapOptionToRoom(
  option: NormalizedHotelOption,
  nights: number
): GoaHotelRoomSnapshot {
  const total = Number(option.pricing?.totalPrice) || 0;
  const perNight = nights > 0 ? Math.round(total / nights) : total;
  return {
    id: option.optionId,
    name: option.roomInfo[0] || option.roomName || "Room",
    type: option.roomType || option.optionType || "Room",
    mealBasis: option.mealBasis,
    mealBasisLabel: option.mealBasisLabel || option.mealBasis,
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

function buildGoaHotelDoc(
  entry: TripJackHotelCatalogEntry,
  cache: TripJackHotelPriceCacheRecord | null
): GoaHotelDocument | null {
  if (entry.isDeleted || entry.websiteVisible === false) return null;
  if (!isIndiaTripJackCatalogHotel(entry)) return null;
  if (entryBrowseCityKey(entry) !== "goa") return null;

  const enriched = enrichCatalogEntryLocation(entry);
  const resolved = formatFeaturedCardLocation(enriched);
  const imageUrls = catalogEntryImageUrls(enriched);
  const nights = nightsBetween(cache?.checkIn, cache?.checkOut);
  const rooms = (cache?.options ?? []).map((opt) => mapOptionToRoom(opt, nights));
  const priceFrom =
    rooms.length > 0
      ? Math.min(...rooms.map((r) => r.pricePerNight || r.totalPrice).filter((n) => n > 0))
      : Number(entry.lastPriceFrom) || Number(cache?.priceFrom) || 0;

  const now = new Date().toISOString();
  const id = `tj_${entry.tjHotelId}`;

  return {
    id,
    tjHotelId: entry.tjHotelId,
    name: entry.name,
    slug: `${slugify(entry.name)}-${entry.tjHotelId}`,
    cityName: "Goa",
    cityKey: "goa",
    locality: enriched.locality || resolved?.locality,
    location: resolveHotelDisplayLocation(enriched) || resolved?.cityName || "Goa",
    address: entry.address || "",
    description: entry.description || "",
    facilities: entry.facilities ?? [],
    policies: entry.policies ?? [],
    starRating: entry.starRating ?? entry.rating ?? null,
    heroImage: enriched.heroImage || imageUrls[0],
    imageUrls,
    images: imageUrls,
    priceFrom: Number.isFinite(priceFrom) ? priceFrom : 0,
    currency: entry.lastPriceCurrency || cache?.currency || "INR",
    rooms,
    lastPricedAt: cache?.fetchedAt || entry.lastPricedAt,
    contentSynced: Boolean(entry.contentSynced),
    websiteVisible: true,
    isDeleted: false,
    source: "tripjack",
    sharedFor: "bookscubagoa",
    updatedAt: now,
  };
}

export async function syncGoaHotelsForBookscubagoa(options?: {
  pageSize?: number;
  maxPages?: number;
}): Promise<{
  exported: number;
  skipped: number;
  withRooms: number;
  totalScanned: number;
}> {
  if (!isAdminEnvConfigured()) {
    throw new Error("Firebase Admin is not configured");
  }
  const db = await getSafeAdminDb();
  if (!db) throw new Error("Firestore unavailable");

  const pageSize = Math.min(50, Math.max(10, options?.pageSize ?? 50));
  const maxPages = Math.min(200, Math.max(1, options?.maxPages ?? 80));

  let page = 1;
  let exported = 0;
  let skipped = 0;
  let withRooms = 0;
  let totalScanned = 0;
  const seen = new Set<number>();

  while (page <= maxPages) {
    const browse = await listBrowsableIndiaHotelsPage({
      page,
      pageSize,
      city: "goa",
    });
    if (!browse.entries.length) break;

    const records: GoaHotelDocument[] = [];

    for (const entry of browse.entries) {
      if (seen.has(entry.tjHotelId)) continue;
      seen.add(entry.tjHotelId);
      totalScanned += 1;

      const cache = await getTripJackHotelPriceCache(entry.tjHotelId);
      const doc = buildGoaHotelDoc(entry, cache);
      if (!doc) {
        skipped += 1;
        continue;
      }
      if (doc.rooms.length > 0) withRooms += 1;
      records.push(doc);
      exported += 1;
    }

    for (let i = 0; i < records.length; i += 400) {
      const chunk = records.slice(i, i + 400);
      const batch = db.batch();
      for (const doc of chunk) {
        batch.set(db.collection(GOA_HOTELS_COLLECTION).doc(doc.id), sanitize(doc), {
          merge: true,
        });
      }
      await batch.commit();
    }

    if (page >= browse.totalPages) break;
    page += 1;
  }

  await db.doc("goaHotelsMeta/sync").set(
    sanitize({
      lastSyncedAt: new Date().toISOString(),
      exported,
      skipped,
      withRooms,
      totalScanned,
      cityKey: "goa",
      sharedFor: "bookscubagoa",
    }),
    { merge: true }
  );

  return { exported, skipped, withRooms, totalScanned };
}
