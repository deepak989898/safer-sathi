import type { Firestore, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { catalogEntryHasDisplayImage, catalogEntryImageUrls } from "@/lib/tripjack-hotels/hotel-images";
import {
  enrichCatalogEntryLocation,
  formatFeaturedCardLocation,
} from "@/lib/tripjack-hotels/catalog-location";
import { isIndiaTripJackCatalogHotel } from "@/lib/tripjack-hotels/india-catalog";
import {
  TRIPJACK_HOTEL_CATALOG_COLLECTION,
  TRIPJACK_HOTEL_CATALOG_META_DOC,
  TRIPJACK_HOTEL_DESTINATIONS_COLLECTION,
  MAX_HOTEL_CONTENT_BATCH,
  type TripJackHotelCatalogEntry,
  type TripJackHotelCatalogMeta,
  type TripJackHotelDestinationIndex,
} from "@/lib/tripjack-hotels/catalog-types";

const FEATURED_PRIORITY_CITIES = [
  "mumbai",
  "delhi",
  "new delhi",
  "goa",
  "jaipur",
  "bengaluru",
  "bangalore",
  "hyderabad",
  "chennai",
  "kolkata",
  "pune",
  "agra",
  "udaipur",
  "shimla",
  "manali",
];

function isMappingOnlyCatalogStub(entry: TripJackHotelCatalogEntry): boolean {
  const name = entry.name.trim();
  return /^hotel\s+\d+$/i.test(name) && !entry.cityName?.trim();
}

function isFeaturedCatalogEntry(entry: TripJackHotelCatalogEntry): boolean {
  if (entry.isDeleted || entry.websiteVisible === false) return false;
  if (!entry.contentSynced) return false;
  if (isMappingOnlyCatalogStub(entry)) return false;
  if (!entry.name?.trim()) return false;
  if (!isIndiaTripJackCatalogHotel(entry)) return false;
  const enriched = enrichCatalogEntryLocation(entry);
  if (!formatFeaturedCardLocation(enriched)) return false;
  return catalogEntryImageUrls(enriched).length > 0 || Boolean(enriched.heroImage);
}

function isFeaturedCatalogEntryRelaxed(entry: TripJackHotelCatalogEntry): boolean {
  if (entry.isDeleted || entry.websiteVisible === false) return false;
  if (!entry.contentSynced) return false;
  if (isMappingOnlyCatalogStub(entry)) return false;
  if (!entry.name?.trim()) return false;
  if (!isIndiaTripJackCatalogHotel(entry)) return false;
  const enriched = enrichCatalogEntryLocation(entry);
  return Boolean(formatFeaturedCardLocation(enriched) || enriched.searchBlob?.trim());
}

function featuredEntryScore(entry: TripJackHotelCatalogEntry): number {
  let score = 0;
  if (entry.contentSynced) score += 100;
  if (catalogEntryImageUrls(entry).length > 0) score += 50;
  if (entry.starRating || entry.rating) score += 10;
  if (entry.heroImage) score += 5;
  return score;
}

const FIRESTORE_BATCH_SIZE = 400;

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function commitBatch(
  collection: string,
  records: Array<{ id: string; data: Record<string, unknown> }>
): Promise<number> {
  if (!records.length) return 0;
  const db = await getSafeAdminDb();
  if (!db) return 0;

  let written = 0;
  for (let i = 0; i < records.length; i += FIRESTORE_BATCH_SIZE) {
    const chunk = records.slice(i, i + FIRESTORE_BATCH_SIZE);
    const batch = db.batch();
    for (const record of chunk) {
      batch.set(db.collection(collection).doc(record.id), sanitize(record.data), { merge: true });
    }
    await batch.commit();
    written += chunk.length;
  }
  return written;
}

export async function getTripJackHotelCatalogMeta(): Promise<TripJackHotelCatalogMeta> {
  const fallback: TripJackHotelCatalogMeta = {
    lastSyncedAt: null,
    totalHotels: 0,
    activeHotels: 0,
    deletedHotels: 0,
    lastSyncNext: null,
    syncInProgress: false,
  };
  if (!isAdminEnvConfigured()) return fallback;

  const db = await getSafeAdminDb();
  if (!db) return fallback;

  const snap = await db.doc(TRIPJACK_HOTEL_CATALOG_META_DOC).get();
  if (!snap.exists) return fallback;
  return { ...fallback, ...(snap.data() as TripJackHotelCatalogMeta) };
}

export async function updateTripJackHotelCatalogMeta(
  patch: Partial<TripJackHotelCatalogMeta>
): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  const db = await getSafeAdminDb();
  if (!db) return;
  await db.doc(TRIPJACK_HOTEL_CATALOG_META_DOC).set(sanitize(patch), { merge: true });
}

export async function upsertTripJackHotelCatalogEntries(
  entries: TripJackHotelCatalogEntry[]
): Promise<number> {
  if (!entries.length) return 0;
  return commitBatch(
    TRIPJACK_HOTEL_CATALOG_COLLECTION,
    entries.map((entry) => ({ id: entry.id, data: entry as unknown as Record<string, unknown> }))
  );
}

export async function upsertTripJackHotelDestinations(
  destinations: TripJackHotelDestinationIndex[]
): Promise<number> {
  if (!destinations.length) return 0;
  return commitBatch(
    TRIPJACK_HOTEL_DESTINATIONS_COLLECTION,
    destinations.map((dest) => ({ id: dest.id, data: dest as unknown as Record<string, unknown> }))
  );
}

export async function countActiveTripJackHotels(): Promise<number> {
  if (!isAdminEnvConfigured()) return 0;
  const db = await getSafeAdminDb();
  if (!db) return 0;

  const snap = await db
    .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
    .where("isDeleted", "==", false)
    .count()
    .get();
  return snap.data().count;
}

export async function countContentSyncedTripJackHotels(): Promise<number> {
  if (!isAdminEnvConfigured()) return 0;
  const db = await getSafeAdminDb();
  if (!db) return 0;

  try {
    const snap = await db
      .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
      .where("contentSynced", "==", true)
      .where("isDeleted", "==", false)
      .count()
      .get();
    return snap.data().count;
  } catch (error) {
    if (!isFirestoreIndexError(error)) throw error;
    const snap = await db
      .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
      .where("contentSynced", "==", true)
      .count()
      .get();
    return snap.data().count;
  }
}

const BROWSE_SCAN_BATCH = 250;

function isFirestoreIndexError(error: unknown): boolean {
  const code = (error as { code?: number | string })?.code;
  if (code === 9 || code === "failed-precondition") return true;
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("FAILED_PRECONDITION") ||
    message.includes("requires an index") ||
    message.includes("failed-precondition")
  );
}

type BrowseCatalogScanMode = "indexed" | "fallback";

async function fetchBrowsableCatalogBatch(
  db: Firestore,
  options: { mode: BrowseCatalogScanMode; lastNameLower?: string }
): Promise<{
  entries: TripJackHotelCatalogEntry[];
  lastNameLower?: string;
  hasMore: boolean;
}> {
  const limit = BROWSE_SCAN_BATCH;

  if (options.mode === "indexed") {
    let query = db
      .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
      .where("contentSynced", "==", true)
      .where("isDeleted", "==", false)
      .orderBy("nameLower")
      .limit(limit);
    if (options.lastNameLower) {
      query = query.startAfter(options.lastNameLower);
    }
    const snap = await query.get();
    const entries = snap.docs.map((doc) => doc.data() as TripJackHotelCatalogEntry);
    return {
      entries,
      lastNameLower: entries[entries.length - 1]?.nameLower,
      hasMore: snap.size >= limit,
    };
  }

  let query = db
    .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
    .orderBy("nameLower")
    .limit(limit * 4);
  if (options.lastNameLower) {
    query = query.startAfter(options.lastNameLower);
  }
  const snap = await query.get();
  const entries = snap.docs
    .map((doc) => doc.data() as TripJackHotelCatalogEntry)
    .filter((entry) => entry.contentSynced && !entry.isDeleted);
  const lastDoc = snap.docs[snap.docs.length - 1]?.data() as TripJackHotelCatalogEntry | undefined;
  return {
    entries,
    lastNameLower: lastDoc?.nameLower,
    hasMore: snap.size >= limit * 4,
  };
}

function entryCityKey(entry: TripJackHotelCatalogEntry): string {
  const fromField = entry.cityNameLower?.trim() || entry.cityName?.trim().toLowerCase() || "";
  if (fromField) return fromField;
  const resolved = formatFeaturedCardLocation(enrichCatalogEntryLocation(entry));
  return resolved?.cityKey ?? "";
}

export async function searchTripJackHotelCatalogByCityPrefix(
  query: string,
  limit = 120
): Promise<TripJackHotelCatalogEntry[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  const q = query.toLowerCase().trim();
  if (!q) return [];

  const snap = await db
    .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
    .orderBy("cityNameLower")
    .startAt(q)
    .endAt(`${q}\uf8ff`)
    .limit(limit * 2)
    .get();

  return snap.docs
    .map((doc) => doc.data() as TripJackHotelCatalogEntry)
    .filter((hotel) => !hotel.isDeleted && hotel.cityNameLower && hotel.contentSynced)
    .slice(0, limit);
}

export async function getTripJackHotelCatalogEntriesByHids(
  hids: number[],
  options?: { browse?: boolean }
): Promise<TripJackHotelCatalogEntry[]> {
  if (!hids.length || !isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  const unique = [...new Set(hids.filter((hid) => Number.isFinite(hid) && hid > 0))];
  const entries: TripJackHotelCatalogEntry[] = [];

  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const refs = chunk.map((hid) =>
      db.collection(TRIPJACK_HOTEL_CATALOG_COLLECTION).doc(`tj_${hid}`)
    );
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const entry = snap.data() as TripJackHotelCatalogEntry;
      if (options?.browse) {
        if (!entry.isDeleted && entry.websiteVisible !== false) entries.push(entry);
      } else if (isFeaturedCatalogEntry(entry)) {
        entries.push(entry);
      }
    }
  }

  return entries;
}

export async function listFeaturedTripJackHotelsFromFirestore(
  pickLimit = 72
): Promise<TripJackHotelCatalogEntry[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  const merged = new Map<number, TripJackHotelCatalogEntry>();
  const addEntries = (entries: TripJackHotelCatalogEntry[], relaxed = false) => {
    const matches = relaxed ? isFeaturedCatalogEntryRelaxed : isFeaturedCatalogEntry;
    for (const entry of entries) {
      if (!matches(entry)) continue;
      const existing = merged.get(entry.tjHotelId);
      if (!existing || featuredEntryScore(entry) > featuredEntryScore(existing)) {
        merged.set(entry.tjHotelId, entry);
      }
    }
  };

  const perCityFetch = 16;

  // Path 1: cityNameLower prefix for popular Indian cities.
  const citySnaps = await Promise.all(
    FEATURED_PRIORITY_CITIES.map((city) =>
      db
        .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
        .orderBy("cityNameLower")
        .startAt(city)
        .endAt(`${city}\uf8ff`)
        .limit(perCityFetch * 2)
        .get()
        .catch((error) => {
          console.warn("[listFeaturedTripJackHotelsFromFirestore] city prefix failed:", city, error);
          return null;
        })
    )
  );

  for (const snap of citySnaps) {
    if (!snap) continue;
    addEntries(snap.docs.map((doc) => doc.data() as TripJackHotelCatalogEntry));
  }

  // Path 2: searchBlob lookup (catches hotels where city is only in address/description).
  if (merged.size < pickLimit) {
    const blobResults = await Promise.all(
      FEATURED_PRIORITY_CITIES.map((city) =>
        findTripJackHotelsBySearchBlob(city, perCityFetch * 2).catch(() => [] as TripJackHotelCatalogEntry[])
      )
    );
    for (const entries of blobResults) {
      addEntries(entries);
    }
  }

  // Path 3: destination index for the same Indian cities.
  if (merged.size < pickLimit) {
    const destinationHids: number[] = [];
    for (const city of FEATURED_PRIORITY_CITIES) {
      if (destinationHids.length >= pickLimit * 2) break;
      const dest = await getTripJackDestinationBySearchKey(city);
      if (!dest?.hids?.length) continue;
      destinationHids.push(...dest.hids.slice(0, 8));
    }
    if (destinationHids.length) {
      addEntries(await getTripJackHotelCatalogEntriesByHids(destinationHids));
    }
  }

  // Path 4: paginate content-synced hotels; falls back when composite index is missing.
  if (merged.size < pickLimit) {
    let lastNameLower: string | undefined;
    let scanMode: BrowseCatalogScanMode = "indexed";
    for (let page = 0; page < 30 && merged.size < pickLimit * 2; page += 1) {
      try {
        const batch = await fetchBrowsableCatalogBatch(db, { mode: scanMode, lastNameLower });
        if (!batch.entries.length) break;

        lastNameLower = batch.lastNameLower;
        addEntries(batch.entries);
        if (!batch.hasMore) break;
      } catch (error) {
        if (scanMode === "indexed" && isFirestoreIndexError(error)) {
          scanMode = "fallback";
          lastNameLower = undefined;
          page = -1;
          continue;
        }
        console.error("[listFeaturedTripJackHotelsFromFirestore] browse scan failed:", error);
        break;
      }
    }
  }

  // Path 5: relaxed scan — content-synced India hotels even when city fields are sparse.
  if (merged.size < Math.min(pickLimit, 12)) {
    let lastNameLower: string | undefined;
    let scanMode: BrowseCatalogScanMode = "indexed";
    for (let page = 0; page < 15 && merged.size < pickLimit; page += 1) {
      try {
        const batch = await fetchBrowsableCatalogBatch(db, { mode: scanMode, lastNameLower });
        if (!batch.entries.length) break;

        lastNameLower = batch.lastNameLower;
        addEntries(batch.entries, true);
        if (!batch.hasMore) break;
      } catch (error) {
        if (scanMode === "indexed" && isFirestoreIndexError(error)) {
          scanMode = "fallback";
          lastNameLower = undefined;
          page = -1;
          continue;
        }
        break;
      }
    }
  }

  return [...merged.values()]
    .sort((a, b) => featuredEntryScore(b) - featuredEntryScore(a))
    .slice(0, pickLimit);
}

/** Fetch next batch of hotel IDs needing content sync (cursor-based scan). */
export async function getNextContentSyncBatch(
  afterTjHotelId: number | null,
  targetSize = 100
): Promise<{ ids: number[]; lastTjHotelId: number | null; hasMore: boolean }> {
  if (!isAdminEnvConfigured()) {
    return { ids: [], lastTjHotelId: afterTjHotelId, hasMore: false };
  }
  const db = await getSafeAdminDb();
  if (!db) return { ids: [], lastTjHotelId: afterTjHotelId, hasMore: false };

  const ids: number[] = [];
  let cursor = afterTjHotelId;
  let scanHasMore = true;

  while (ids.length < targetSize && scanHasMore) {
    let query = db.collection(TRIPJACK_HOTEL_CATALOG_COLLECTION).orderBy("tjHotelId").limit(250);
    if (cursor != null) {
      query = query.startAfter(cursor);
    }

    const snap = await query.get();
    if (snap.empty) {
      scanHasMore = false;
      break;
    }

    for (const doc of snap.docs) {
      const hotel = doc.data() as TripJackHotelCatalogEntry;
      cursor = hotel.tjHotelId;
      if (hotel.isDeleted) continue;
      if (hotel.contentSynced) continue;
      ids.push(hotel.tjHotelId);
      if (ids.length >= targetSize) break;
    }

    if (snap.size < 250) {
      scanHasMore = false;
    }
  }

  return {
    ids,
    lastTjHotelId: cursor,
    hasMore: scanHasMore || ids.length >= targetSize,
  };
}

/** Hotels with content synced but missing resolvable city/locality. */
export async function getNextLocationBackfillBatch(
  afterTjHotelId: number | null,
  targetSize = MAX_HOTEL_CONTENT_BATCH
): Promise<{ ids: number[]; lastTjHotelId: number | null; hasMore: boolean }> {
  if (!isAdminEnvConfigured()) {
    return { ids: [], lastTjHotelId: afterTjHotelId, hasMore: false };
  }
  const db = await getSafeAdminDb();
  if (!db) return { ids: [], lastTjHotelId: afterTjHotelId, hasMore: false };

  const ids: number[] = [];
  let cursor = afterTjHotelId;
  let scanHasMore = true;

  while (ids.length < targetSize && scanHasMore) {
    let query = db.collection(TRIPJACK_HOTEL_CATALOG_COLLECTION).orderBy("tjHotelId").limit(300);
    if (cursor != null) {
      query = query.startAfter(cursor);
    }

    const snap = await query.get();
    if (snap.empty) {
      scanHasMore = false;
      break;
    }

    for (const doc of snap.docs) {
      const hotel = doc.data() as TripJackHotelCatalogEntry;
      cursor = hotel.tjHotelId;
      if (hotel.isDeleted || !hotel.contentSynced) continue;
      const enriched = enrichCatalogEntryLocation(hotel);
      const hasLocation = Boolean(formatFeaturedCardLocation(enriched));
      const needsAddress = !hotel.address?.trim();
      if (!hasLocation || !hotel.cityName?.trim() || needsAddress) {
        ids.push(hotel.tjHotelId);
        if (ids.length >= targetSize) break;
      }
    }

    if (snap.size < 300) scanHasMore = false;
  }

  return {
    ids,
    lastTjHotelId: cursor,
    hasMore: scanHasMore || ids.length >= targetSize,
  };
}

/** Hotels with content synced but no resolvable display image. */
export async function getNextMissingImageBackfillBatch(
  afterTjHotelId: number | null,
  targetSize = MAX_HOTEL_CONTENT_BATCH
): Promise<{ ids: number[]; lastTjHotelId: number | null; hasMore: boolean }> {
  if (!isAdminEnvConfigured()) {
    return { ids: [], lastTjHotelId: afterTjHotelId, hasMore: false };
  }
  const db = await getSafeAdminDb();
  if (!db) return { ids: [], lastTjHotelId: afterTjHotelId, hasMore: false };

  const ids: number[] = [];
  let cursor = afterTjHotelId;
  let scanHasMore = true;

  while (ids.length < targetSize && scanHasMore) {
    let query = db.collection(TRIPJACK_HOTEL_CATALOG_COLLECTION).orderBy("tjHotelId").limit(300);
    if (cursor != null) {
      query = query.startAfter(cursor);
    }

    const snap = await query.get();
    if (snap.empty) {
      scanHasMore = false;
      break;
    }

    for (const doc of snap.docs) {
      const hotel = doc.data() as TripJackHotelCatalogEntry;
      cursor = hotel.tjHotelId;
      if (hotel.isDeleted || !hotel.contentSynced) continue;
      if (hotel.hasDisplayImage === true) continue;
      if (catalogEntryHasDisplayImage(hotel)) continue;
      ids.push(hotel.tjHotelId);
      if (ids.length >= targetSize) break;
    }

    if (snap.size < 300) scanHasMore = false;
  }

  return {
    ids,
    lastTjHotelId: cursor,
    hasMore: scanHasMore || ids.length >= targetSize,
  };
}

export interface TripJackHotelCatalogImageStats {
  totalHotels: number;
  hotelsWithImage: number;
  hotelsWithoutImage: number;
  contentSynced: number;
  computedAt: string;
}

const IMAGE_STATS_CACHE_MS = 60 * 60 * 1000;

async function countCatalogHotelsByDisplayImage(hasImage: boolean): Promise<number | null> {
  if (!isAdminEnvConfigured()) return 0;
  const db = await getSafeAdminDb();
  if (!db) return 0;

  try {
    const snap = await db
      .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
      .where("isDeleted", "==", false)
      .where("hasDisplayImage", "==", hasImage)
      .count()
      .get();
    return snap.data().count;
  } catch (error) {
    if (!isFirestoreIndexError(error)) throw error;
    return null;
  }
}

async function scanCatalogImageStats(): Promise<TripJackHotelCatalogImageStats> {
  if (!isAdminEnvConfigured()) {
    return {
      totalHotels: 0,
      hotelsWithImage: 0,
      hotelsWithoutImage: 0,
      contentSynced: 0,
      computedAt: new Date().toISOString(),
    };
  }
  const db = await getSafeAdminDb();
  if (!db) {
    return {
      totalHotels: 0,
      hotelsWithImage: 0,
      hotelsWithoutImage: 0,
      contentSynced: 0,
      computedAt: new Date().toISOString(),
    };
  }

  let totalHotels = 0;
  let hotelsWithImage = 0;
  let hotelsWithoutImage = 0;
  let contentSynced = 0;
  let cursor: number | null = null;
  let hasMore = true;

  while (hasMore) {
    let query = db.collection(TRIPJACK_HOTEL_CATALOG_COLLECTION).orderBy("tjHotelId").limit(500);
    if (cursor != null) {
      query = query.startAfter(cursor);
    }

    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const hotel = doc.data() as TripJackHotelCatalogEntry;
      cursor = hotel.tjHotelId;
      if (hotel.isDeleted) continue;
      totalHotels += 1;
      if (hotel.contentSynced) contentSynced += 1;
      if (catalogEntryHasDisplayImage(hotel)) {
        hotelsWithImage += 1;
      } else {
        hotelsWithoutImage += 1;
      }
    }

    hasMore = snap.size >= 500;
  }

  return {
    totalHotels,
    hotelsWithImage,
    hotelsWithoutImage,
    contentSynced,
    computedAt: new Date().toISOString(),
  };
}

export async function getTripJackHotelCatalogImageStats(options?: {
  force?: boolean;
}): Promise<TripJackHotelCatalogImageStats> {
  const meta = await getTripJackHotelCatalogMeta();
  const cached = meta.imageStats;
  if (
    !options?.force &&
    cached?.computedAt &&
    Date.now() - new Date(cached.computedAt).getTime() < IMAGE_STATS_CACHE_MS
  ) {
    return cached;
  }

  const [totalHotels, contentSynced, withIndexed, withoutIndexed] = await Promise.all([
    countActiveTripJackHotels(),
    countContentSyncedTripJackHotels(),
    countCatalogHotelsByDisplayImage(true),
    countCatalogHotelsByDisplayImage(false),
  ]);

  let stats: TripJackHotelCatalogImageStats;
  if (withIndexed != null && withoutIndexed != null && withIndexed + withoutIndexed >= totalHotels * 0.5) {
    stats = {
      totalHotels,
      hotelsWithImage: withIndexed,
      hotelsWithoutImage: withoutIndexed,
      contentSynced,
      computedAt: new Date().toISOString(),
    };
  } else {
    stats = await scanCatalogImageStats();
  }

  await updateTripJackHotelCatalogMeta({ imageStats: stats });
  return stats;
}

/** Fast pass: derive city/locality from existing name/address without TripJack API. */
export async function enrichCatalogLocationBulkChunk(
  maxRecords = 5000
): Promise<{
  scanned: number;
  updated: number;
  hasMore: boolean;
}> {
  if (!isAdminEnvConfigured()) {
    return { scanned: 0, updated: 0, hasMore: false };
  }
  const db = await getSafeAdminDb();
  if (!db) return { scanned: 0, updated: 0, hasMore: false };

  const meta = await getTripJackHotelCatalogMeta();
  let cursor = meta.locationEnrichCursor ?? null;
  let scanned = 0;
  let updated = 0;
  let scanHasMore = true;
  const pending: TripJackHotelCatalogEntry[] = [];

  const flush = async () => {
    if (!pending.length) return;
    await upsertTripJackHotelCatalogEntries(pending.splice(0, pending.length));
  };

  while (scanned < maxRecords && scanHasMore) {
    let query = db.collection(TRIPJACK_HOTEL_CATALOG_COLLECTION).orderBy("tjHotelId").limit(400);
    if (cursor != null) {
      query = query.startAfter(cursor);
    }

    const snap = await query.get();
    if (snap.empty) {
      scanHasMore = false;
      break;
    }

    for (const doc of snap.docs) {
      const hotel = doc.data() as TripJackHotelCatalogEntry;
      cursor = hotel.tjHotelId;
      if (hotel.isDeleted || !hotel.contentSynced) continue;

      scanned += 1;
      const enriched = enrichCatalogEntryLocation(hotel);
      const locationNow = formatFeaturedCardLocation(enriched);
      const locationBefore = formatFeaturedCardLocation(hotel);
      const changed =
        enriched.cityName !== hotel.cityName ||
        enriched.cityNameLower !== hotel.cityNameLower ||
        enriched.region !== hotel.region ||
        enriched.searchBlob !== hotel.searchBlob ||
        Boolean(locationNow && !locationBefore);

      if (changed) {
        pending.push(enriched);
        updated += 1;
      }

      if (scanned >= maxRecords) break;
      if (pending.length >= FIRESTORE_BATCH_SIZE) {
        await flush();
      }
    }

    if (snap.size < 400) scanHasMore = false;
  }

  await flush();
  await updateTripJackHotelCatalogMeta({
    locationEnrichCursor: scanHasMore ? cursor : null,
  });

  return {
    scanned,
    updated,
    hasMore: scanHasMore,
  };
}

export async function searchTripJackHotelCatalogByNamePrefix(
  query: string,
  limit = 15
): Promise<TripJackHotelCatalogEntry[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  const q = query.toLowerCase().trim();
  if (!q) return [];

  const snap = await db
    .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
    .orderBy("nameLower")
    .startAt(q)
    .endAt(`${q}\uf8ff`)
    .limit(limit * 2)
    .get();

  return snap.docs
    .map((doc) => doc.data() as TripJackHotelCatalogEntry)
    .filter((hotel) => !hotel.isDeleted)
    .slice(0, limit);
}

export async function searchTripJackHotelDestinations(
  query: string,
  limit = 20
): Promise<TripJackHotelDestinationIndex[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  const q = query.toLowerCase().trim();
  if (!q) return [];

  const snap = await db
    .collection(TRIPJACK_HOTEL_DESTINATIONS_COLLECTION)
    .orderBy("searchKey")
    .startAt(q)
    .endAt(`${q}\uf8ff`)
    .limit(limit)
    .get();

  return snap.docs.map((doc) => doc.data() as TripJackHotelDestinationIndex);
}

export async function getPopularTripJackHotelDestinations(
  limit = 12
): Promise<TripJackHotelDestinationIndex[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  const snap = await db
    .collection(TRIPJACK_HOTEL_DESTINATIONS_COLLECTION)
    .orderBy("hotelCount", "desc")
    .limit(limit * 3)
    .get();

  return snap.docs
    .map((doc) => doc.data() as TripJackHotelDestinationIndex)
    .filter((dest) => dest.type === "city")
    .slice(0, limit);
}

export async function getTripJackDestinationBySearchKey(
  searchKey: string
): Promise<TripJackHotelDestinationIndex | null> {
  if (!isAdminEnvConfigured()) return null;
  const db = await getSafeAdminDb();
  if (!db) return null;

  const key = searchKey.toLowerCase().trim();
  const exact = await db
    .collection(TRIPJACK_HOTEL_DESTINATIONS_COLLECTION)
    .where("searchKey", "==", key)
    .limit(1)
    .get();
  if (!exact.empty) return exact.docs[0].data() as TripJackHotelDestinationIndex;

  const prefix = await searchTripJackHotelDestinations(key, 5);
  return prefix.find((d) => d.searchKey === key) ?? prefix[0] ?? null;
}

export async function findTripJackHotelsBySearchBlob(
  query: string,
  limit = 120
): Promise<TripJackHotelCatalogEntry[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  const q = query.toLowerCase().trim();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);
  const firstToken = tokens[0] ?? q;

  const snap = await db
    .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
    .orderBy("searchBlob")
    .startAt(firstToken)
    .endAt(`${firstToken}\uf8ff`)
    .limit(limit * 2)
    .get();

  const hotels = snap.docs.map((doc) => doc.data() as TripJackHotelCatalogEntry);
  return hotels.filter((hotel) => !hotel.isDeleted && hotel.searchBlob.includes(q)).slice(0, limit);
}

function isBrowsableIndiaHotel(entry: TripJackHotelCatalogEntry): boolean {
  if (entry.isDeleted || entry.websiteVisible === false) return false;
  if (!isIndiaTripJackCatalogHotel(entry)) return false;
  if (isMappingOnlyCatalogStub(entry)) return false;
  if (!entry.name?.trim()) return false;
  const enriched = enrichCatalogEntryLocation(entry);
  return entry.contentSynced || Boolean(formatFeaturedCardLocation(enriched));
}

export interface BrowsableHotelsPageResult {
  entries: TripJackHotelCatalogEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export async function listBrowsableIndiaHotelsPage(input: {
  page: number;
  pageSize: number;
  query?: string;
  city?: string;
  minStars?: number;
}): Promise<BrowsableHotelsPageResult> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(50, Math.max(1, input.pageSize));
  const query = input.query?.trim().toLowerCase() ?? "";
  const city = input.city?.trim().toLowerCase() ?? "";
  const minStars = input.minStars ?? 0;

  const matchesFilters = (entry: TripJackHotelCatalogEntry) => {
    if (!isBrowsableIndiaHotel(entry)) return false;
    if (city) {
      const entryCity = entryCityKey(entry);
      if (entryCity !== city && !entryCity.startsWith(city)) return false;
    }
    if (query) {
      const haystack = entry.searchBlob || buildSearchBlobFromEntry(entry);
      if (!haystack.includes(query) && !entry.nameLower.includes(query) && !entryCityKey(entry).includes(query)) {
        return false;
      }
    }
    const stars = entry.starRating ?? entry.rating ?? 0;
    if (minStars > 0 && stars < minStars) return false;
    return true;
  };

  if (query.length >= 2) {
    const [byCity, byName, byBlob] = await Promise.all([
      searchTripJackHotelCatalogByCityPrefix(query, 300),
      searchTripJackHotelCatalogByNamePrefix(query, 120),
      findTripJackHotelsBySearchBlob(query, 300),
    ]);
    const merged = new Map<number, TripJackHotelCatalogEntry>();
    for (const entry of [...byCity, ...byName, ...byBlob]) {
      if (!merged.has(entry.tjHotelId)) merged.set(entry.tjHotelId, entry);
    }
    const filtered = [...merged.values()].filter(matchesFilters).sort((a, b) => a.nameLower.localeCompare(b.nameLower));
    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const start = (page - 1) * pageSize;
    return {
      entries: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  }

  if (city && query.length < 2) {
    const fetchLimit = Math.min(3000, Math.max(400, page * pageSize * 4));
    const [byCity, byBlob] = await Promise.all([
      searchTripJackHotelCatalogByCityPrefix(city, fetchLimit),
      findTripJackHotelsBySearchBlob(city, fetchLimit),
    ]);
    const merged = new Map<number, TripJackHotelCatalogEntry>();
    for (const entry of [...byCity, ...byBlob]) {
      if (!merged.has(entry.tjHotelId)) merged.set(entry.tjHotelId, entry);
    }
    const filtered = [...merged.values()]
      .filter(matchesFilters)
      .sort((a, b) => a.nameLower.localeCompare(b.nameLower));
    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const start = (page - 1) * pageSize;
    return {
      entries: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      totalCount,
      totalPages,
    };
  }

  if (!isAdminEnvConfigured()) {
    return { entries: [], page, pageSize, totalCount: 0, totalPages: 1 };
  }
  const db = await getSafeAdminDb();
  if (!db) {
    return { entries: [], page, pageSize, totalCount: 0, totalPages: 1 };
  }

  const skip = (page - 1) * pageSize;
  const matched: TripJackHotelCatalogEntry[] = [];
  let lastNameLower: string | undefined;
  let scanComplete = false;
  let scanMode: BrowseCatalogScanMode = "indexed";

  while (matched.length < skip + pageSize && !scanComplete) {
    try {
      const batch = await fetchBrowsableCatalogBatch(db, {
        mode: scanMode,
        lastNameLower,
      });
      if (!batch.entries.length) {
        scanComplete = true;
        break;
      }

      lastNameLower = batch.lastNameLower;
      for (const entry of batch.entries) {
        if (!matchesFilters(entry)) continue;
        matched.push(entry);
      }

      if (!batch.hasMore) scanComplete = true;
      if (matched.length >= skip + pageSize + pageSize) scanComplete = true;
    } catch (error) {
      if (scanMode === "indexed" && isFirestoreIndexError(error)) {
        console.warn(
          "[listBrowsableIndiaHotelsPage] composite index missing, using fallback scan:",
          error instanceof Error ? error.message : error
        );
        scanMode = "fallback";
        lastNameLower = undefined;
        matched.length = 0;
        continue;
      }
      throw error;
    }
  }

  let totalCount = matched.length;
  try {
    totalCount = Math.max(matched.length, await countContentSyncedTripJackHotels());
  } catch {
    // count() can also require an index; matched length is enough for pagination UI.
  }
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    entries: matched.slice(skip, skip + pageSize),
    page,
    pageSize,
    totalCount,
    totalPages,
  };
}

function buildSearchBlobFromEntry(entry: TripJackHotelCatalogEntry): string {
  return [
    entry.name,
    entry.cityName,
    entry.stateName,
    entry.countryName,
    entry.address,
    entry.propertyType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export async function getTripJackHotelCatalogEntryByHid(
  hid: number | string
): Promise<TripJackHotelCatalogEntry | null> {
  if (!isAdminEnvConfigured()) return null;
  const db = await getSafeAdminDb();
  if (!db) return null;

  const id = `tj_${hid}`;
  const snap = await db.collection(TRIPJACK_HOTEL_CATALOG_COLLECTION).doc(id).get();
  if (!snap.exists) return null;
  const entry = snap.data() as TripJackHotelCatalogEntry;
  return entry.isDeleted ? null : entry;
}

export async function updateTripJackHotelCatalogVisibility(
  hid: number | string,
  websiteVisible: boolean
): Promise<TripJackHotelCatalogEntry | null> {
  if (!isAdminEnvConfigured()) return null;
  const db = await getSafeAdminDb();
  if (!db) return null;

  const id = `tj_${hid}`;
  const ref = db.collection(TRIPJACK_HOTEL_CATALOG_COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return null;

  const now = new Date().toISOString();
  await ref.set({ websiteVisible, updatedAt: now }, { merge: true });
  const entry = { ...(snap.data() as TripJackHotelCatalogEntry), websiteVisible, updatedAt: now };
  return entry;
}

export async function getTripJackCatalogVisibilityMap(
  hids: Array<number | string>
): Promise<Map<number, boolean>> {
  const map = new Map<number, boolean>();
  if (!hids.length || !isAdminEnvConfigured()) {
    for (const hid of hids) map.set(Number(hid), true);
    return map;
  }

  const db = await getSafeAdminDb();
  if (!db) {
    for (const hid of hids) map.set(Number(hid), true);
    return map;
  }

  const unique = [...new Set(hids.map((hid) => Number(hid)).filter((id) => Number.isFinite(id) && id > 0))];
  await Promise.all(
    unique.map(async (hid) => {
      const snap = await db.collection(TRIPJACK_HOTEL_CATALOG_COLLECTION).doc(`tj_${hid}`).get();
      if (!snap.exists) {
        map.set(hid, true);
        return;
      }
      const entry = snap.data() as TripJackHotelCatalogEntry;
      map.set(hid, entry.websiteVisible !== false && !entry.isDeleted);
    })
  );
  return map;
}

export async function getAllTripJackActiveHotelsForIndexRebuild(): Promise<
  TripJackHotelCatalogEntry[]
> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  const all: TripJackHotelCatalogEntry[] = [];
  let lastDoc: QueryDocumentSnapshot | undefined;

  while (true) {
    let query = db.collection(TRIPJACK_HOTEL_CATALOG_COLLECTION).orderBy("tjHotelId").limit(500);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      const hotel = doc.data() as TripJackHotelCatalogEntry;
      if (!hotel.isDeleted) all.push(hotel);
    }
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < 500) break;
  }

  return all;
}

export function slugifyDestination(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function buildDestinationIndexFromHotels(
  hotels: TripJackHotelCatalogEntry[]
): TripJackHotelDestinationIndex[] {
  const now = new Date().toISOString();
  const cityMap = new Map<string, TripJackHotelDestinationIndex>();
  const countryMap = new Map<string, TripJackHotelDestinationIndex>();

  for (const hotel of hotels) {
    if (hotel.isDeleted) continue;
    if (!hotel.cityName) continue;

    const cityKey = slugifyDestination(`${hotel.cityName}_${hotel.countryCode || hotel.countryName}`);
    const existing = cityMap.get(cityKey);
    if (existing) {
      existing.hids.push(hotel.tjHotelId);
      existing.hotelCount += 1;
    } else {
      cityMap.set(cityKey, {
        id: `city_${cityKey}`,
        type: "city",
        label: hotel.cityName,
        searchKey: hotel.cityName.toLowerCase(),
        countryName: hotel.countryName,
        hotelCount: 1,
        hids: [hotel.tjHotelId],
        updatedAt: now,
      });
    }

    if (hotel.countryName) {
      const countryKey = slugifyDestination(hotel.countryName);
      const existing = countryMap.get(countryKey);
      if (existing) {
        existing.hids.push(hotel.tjHotelId);
        existing.hotelCount += 1;
      } else {
        countryMap.set(countryKey, {
          id: `country_${countryKey}`,
          type: "country",
          label: hotel.countryName,
          searchKey: hotel.countryName.toLowerCase(),
          countryName: hotel.countryName,
          hotelCount: 1,
          hids: [hotel.tjHotelId],
          updatedAt: now,
        });
      }
    }
  }

  return [...cityMap.values(), ...countryMap.values()];
}
