import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import {
  TRIPJACK_HOTEL_CATALOG_COLLECTION,
  TRIPJACK_HOTEL_CATALOG_META_DOC,
  TRIPJACK_HOTEL_DESTINATIONS_COLLECTION,
  type TripJackHotelCatalogEntry,
  type TripJackHotelCatalogMeta,
  type TripJackHotelDestinationIndex,
} from "@/lib/tripjack-hotels/catalog-types";

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
