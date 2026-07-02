import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { POPULAR_BUS_CITY_SEARCH_NAMES } from "@/lib/bus/cities-search";
import type {
  BusApiLog,
  BusAliasRecord,
  BusBookingRecord,
  BusBookingStatus,
  BusCityRecord,
} from "@/lib/seatseller/types";

const COLLECTIONS = {
  cities: "busCities",
  aliases: "busAliases",
  bookings: "busBookings",
  apiLogs: "busApiLogs",
  searchLogs: "busSearchLogs",
  meta: "busMeta",
} as const;

/** Firestore allows max 500 operations per batch — stay safely under that. */
const FIRESTORE_BATCH_SIZE = 400;

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function logBusApiCall(input: {
  endpoint: string;
  method: string;
  success: boolean;
  statusCode?: number;
  error?: string;
  bookingId?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
}): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    const log: BusApiLog = {
      id: `buslog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...input,
      createdAt: new Date().toISOString(),
    };
    await db.collection(COLLECTIONS.apiLogs).doc(log.id).set(sanitize(log));
  } catch (error) {
    console.warn("logBusApiCall failed:", error);
  }
}

export async function logBusSearch(input: {
  sourceCityId: string;
  destinationCityId: string;
  doj: string;
  resultCount: number;
  userId?: string;
}): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    const id = `search_${Date.now()}`;
    await db.collection(COLLECTIONS.searchLogs).doc(id).set(
      sanitize({
        id,
        ...input,
        createdAt: new Date().toISOString(),
      })
    );
  } catch {
    // non-critical
  }
}

async function commitCollectionInBatches(
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
      const ref = db.collection(collection).doc(record.id);
      batch.set(ref, sanitize(record.data), { merge: true });
    }
    await batch.commit();
    written += chunk.length;
  }
  return written;
}

export async function syncBusCities(cities: BusCityRecord[]): Promise<number> {
  if (!isAdminEnvConfigured()) return cities.length;
  const count = await commitCollectionInBatches(
    COLLECTIONS.cities,
    cities.map((city) => ({ id: city.id, data: city as unknown as Record<string, unknown> }))
  );
  if (count > 0) {
    const db = await getSafeAdminDb();
    if (db) {
      await db.collection(COLLECTIONS.meta).doc("cities").set(
        sanitize({
          lastSyncedAt: new Date().toISOString(),
          count,
        }),
        { merge: true }
      );
    }
  }
  return count;
}

export async function syncBusAliases(aliases: BusAliasRecord[]): Promise<number> {
  if (!isAdminEnvConfigured()) return aliases.length;
  const now = new Date().toISOString();
  return commitCollectionInBatches(
    COLLECTIONS.aliases,
    aliases.map((alias) => ({
      id: alias.id,
      data: { ...alias, syncedAt: now } as Record<string, unknown>,
    }))
  );
}

export async function getBusAliasesFromDb(): Promise<BusAliasRecord[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];
  const snap = await db.collection(COLLECTIONS.aliases).orderBy("cityName").limit(5000).get();
  return snap.docs.map((d) => d.data() as BusAliasRecord);
}

export async function getBusCitiesFromDb(): Promise<BusCityRecord[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];
  const snap = await db.collection(COLLECTIONS.cities).orderBy("name").limit(5000).get();
  return snap.docs.map((d) => d.data() as BusCityRecord);
}

/** Prefix search across all synced cities (not limited to first 5000 alphabetically). */
export async function searchBusCitiesInDb(
  query: string,
  limit = 80
): Promise<BusCityRecord[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  const q = query.toLowerCase().trim();
  if (!q) return [];

  const snap = await db
    .collection(COLLECTIONS.cities)
    .orderBy("searchName")
    .startAt(q)
    .endAt(`${q}\uf8ff`)
    .limit(limit)
    .get();

  return snap.docs.map((d) => d.data() as BusCityRecord);
}

/** Quick picks for empty / short search — includes sandbox sample-route cities. */
export async function getPopularBusCitiesFromDb(): Promise<BusCityRecord[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  const names = [...POPULAR_BUS_CITY_SEARCH_NAMES];
  const snap = await db
    .collection(COLLECTIONS.cities)
    .where("searchName", "in", names.slice(0, 30))
    .get();

  const bySearchName = new Map<string, BusCityRecord>();
  for (const doc of snap.docs) {
    const city = doc.data() as BusCityRecord;
    const key = city.searchName ?? city.name.toLowerCase().trim();
    const existing = bySearchName.get(key);
    if (!existing || city.name.length < existing.name.length) {
      bySearchName.set(key, city);
    }
  }

  return names
    .map((name) => bySearchName.get(name))
    .filter((city): city is BusCityRecord => Boolean(city));
}

export async function findBusCityByName(name: string): Promise<BusCityRecord | null> {
  if (!isAdminEnvConfigured()) return null;
  const db = await getSafeAdminDb();
  if (!db) return null;

  const searchName = name.toLowerCase().trim();
  const snap = await db
    .collection(COLLECTIONS.cities)
    .where("searchName", "==", searchName)
    .limit(10)
    .get();

  if (!snap.empty) {
    const cities = snap.docs.map((d) => d.data() as BusCityRecord);
    return cities.sort((a, b) => a.name.length - b.name.length)[0];
  }

  const prefixMatches = await searchBusCitiesInDb(searchName, 20);
  const exact = prefixMatches.find(
    (city) => (city.searchName ?? city.name.toLowerCase().trim()) === searchName
  );
  return exact ?? prefixMatches[0] ?? null;
}

export async function getBusCitiesLastSyncedAt(): Promise<string | null> {
  if (!isAdminEnvConfigured()) return null;
  const db = await getSafeAdminDb();
  if (!db) return null;

  const meta = await db.collection(COLLECTIONS.meta).doc("cities").get();
  if (meta.exists) {
    const lastSyncedAt = meta.data()?.lastSyncedAt;
    if (typeof lastSyncedAt === "string" && lastSyncedAt) return lastSyncedAt;
  }

  const cities = await getBusCitiesFromDb();
  if (!cities.length) return null;
  return cities.reduce(
    (latest, c) => (c.updatedAt > latest ? c.updatedAt : latest),
    cities[0].updatedAt
  );
}

export async function createBusBooking(
  record: BusBookingRecord
): Promise<BusBookingRecord> {
  if (!isAdminEnvConfigured()) return record;
  const db = await getSafeAdminDb();
  if (!db) return record;
  await db.collection(COLLECTIONS.bookings).doc(record.bookingId).set(sanitize(record));
  return record;
}

export async function updateBusBooking(
  bookingId: string,
  updates: Partial<BusBookingRecord>
): Promise<BusBookingRecord | null> {
  const existing = await getBusBookingById(bookingId);
  if (!existing) return null;
  const updated: BusBookingRecord = {
    ...existing,
    ...updates,
    bookingId: existing.bookingId,
    updatedAt: new Date().toISOString(),
  };
  if (!isAdminEnvConfigured()) return updated;
  const db = await getSafeAdminDb();
  if (!db) return updated;
  await db.collection(COLLECTIONS.bookings).doc(bookingId).set(sanitize(updated), { merge: true });
  return updated;
}

export async function getBusBookingById(bookingId: string): Promise<BusBookingRecord | null> {
  if (!isAdminEnvConfigured()) return null;
  const db = await getSafeAdminDb();
  if (!db) return null;
  const doc = await db.collection(COLLECTIONS.bookings).doc(bookingId).get();
  if (!doc.exists) return null;
  return doc.data() as BusBookingRecord;
}

export async function listBusBookings(filters?: {
  userId?: string;
  email?: string;
  status?: BusBookingStatus;
  limit?: number;
}): Promise<BusBookingRecord[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  let query = db.collection(COLLECTIONS.bookings).orderBy("createdAt", "desc");
  if (filters?.status) {
    query = query.where("status", "==", filters.status) as typeof query;
  }
  const snap = await query.limit(filters?.limit ?? 200).get();
  let rows = snap.docs.map((d) => d.data() as BusBookingRecord);

  if (filters?.userId) {
    rows = rows.filter((b) => b.userId === filters.userId);
  }
  if (filters?.email) {
    const email = filters.email.toLowerCase();
    rows = rows.filter((b) => b.customerEmail.toLowerCase() === email);
  }
  return rows;
}

export async function listBusApiLogs(limit = 100): Promise<BusApiLog[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(COLLECTIONS.apiLogs)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as BusApiLog);
}

export function generateBusBookingId(): string {
  return `bus_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
