import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { catalogEntryImageUrls } from "@/lib/tripjack-hotels/hotel-images";
import {
  hasFeaturedIndianCity,
  isIndiaTripJackCatalogHotel,
} from "@/lib/tripjack-hotels/india-catalog";
import {
  TRIPJACK_HOTEL_CATALOG_COLLECTION,
  TRIPJACK_HOTEL_CATALOG_META_DOC,
  TRIPJACK_HOTEL_DESTINATIONS_COLLECTION,
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
  return hasFeaturedIndianCity(entry);
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

  const snap = await db
    .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
    .where("contentSynced", "==", true)
    .where("isDeleted", "==", false)
    .count()
    .get();
  return snap.data().count;
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
  const addEntries = (entries: TripJackHotelCatalogEntry[]) => {
    for (const entry of entries) {
      if (!isFeaturedCatalogEntry(entry)) continue;
      const existing = merged.get(entry.tjHotelId);
      if (!existing || featuredEntryScore(entry) > featuredEntryScore(existing)) {
        merged.set(entry.tjHotelId, entry);
      }
    }
  };

  const perCityFetch = 12;

  // Fast path: parallel fetch by popular Indian city prefixes (India hotels only).
  const citySnaps = await Promise.all(
    FEATURED_PRIORITY_CITIES.map((city) =>
      db
        .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
        .orderBy("cityNameLower")
        .startAt(city)
        .endAt(`${city}\uf8ff`)
        .limit(perCityFetch * 2)
        .get()
        .catch(() => null)
    )
  );

  for (const snap of citySnaps) {
    if (!snap) continue;
    addEntries(snap.docs.map((doc) => doc.data() as TripJackHotelCatalogEntry));
  }

  // Boost from destination index for the same Indian cities.
  if (merged.size < pickLimit) {
    const destinationHids: number[] = [];
    for (const city of FEATURED_PRIORITY_CITIES) {
      if (destinationHids.length >= pickLimit * 2) break;
      const dest = await getTripJackDestinationBySearchKey(city);
      if (!dest?.hids?.length) continue;
      destinationHids.push(...dest.hids.slice(0, 6));
    }
    if (destinationHids.length) {
      addEntries(await getTripJackHotelCatalogEntriesByHids(destinationHids));
    }
  }

  // Fallback: paginate content-synced hotels and keep India + city matches only.
  if (merged.size < pickLimit) {
    let cursor: number | undefined;
    for (let page = 0; page < 8 && merged.size < pickLimit * 2; page += 1) {
      try {
        let query = db
          .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
          .where("contentSynced", "==", true)
          .orderBy("tjHotelId")
          .limit(250);
        if (cursor != null) {
          query = query.startAfter(cursor);
        }
        const snap = await query.get();
        if (snap.empty) break;

        for (const doc of snap.docs) {
          const entry = doc.data() as TripJackHotelCatalogEntry;
          cursor = entry.tjHotelId;
          if (isFeaturedCatalogEntry(entry)) {
            addEntries([entry]);
          }
        }

        if (snap.size < 250) break;
      } catch (error) {
        console.error("[listFeaturedTripJackHotelsFromFirestore] paginated scan failed:", error);
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
  return entry.contentSynced || hasFeaturedIndianCity(entry);
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
    if (city && entry.cityNameLower !== city && !entry.cityNameLower.startsWith(city)) return false;
    if (query) {
      const haystack = entry.searchBlob || buildSearchBlobFromEntry(entry);
      if (!haystack.includes(query) && !entry.nameLower.includes(query) && !entry.cityNameLower.includes(query)) {
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

  while (matched.length < skip + pageSize && !scanComplete) {
    let firestoreQuery = db
      .collection(TRIPJACK_HOTEL_CATALOG_COLLECTION)
      .where("contentSynced", "==", true)
      .where("isDeleted", "==", false)
      .orderBy("nameLower")
      .limit(200);
    if (lastNameLower) {
      firestoreQuery = firestoreQuery.startAfter(lastNameLower);
    }

    const snap = await firestoreQuery.get();
    if (snap.empty) {
      scanComplete = true;
      break;
    }

    for (const doc of snap.docs) {
      const entry = doc.data() as TripJackHotelCatalogEntry;
      lastNameLower = entry.nameLower;
      if (!matchesFilters(entry)) continue;
      matched.push(entry);
    }

    if (snap.size < 200) scanComplete = true;
    if (matched.length >= skip + pageSize + pageSize) scanComplete = true;
  }

  const totalEstimate = await countContentSyncedTripJackHotels();
  const totalCount = Math.max(matched.length, totalEstimate);
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
