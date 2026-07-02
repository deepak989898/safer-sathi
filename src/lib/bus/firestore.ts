import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
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
} as const;

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

export async function syncBusCities(cities: BusCityRecord[]): Promise<number> {
  if (!isAdminEnvConfigured()) return cities.length;
  const db = await getSafeAdminDb();
  if (!db) return 0;

  const batch = db.batch();
  const now = new Date().toISOString();
  for (const city of cities) {
    const ref = db.collection(COLLECTIONS.cities).doc(city.id);
    batch.set(ref, sanitize({ ...city, syncedAt: now }), { merge: true });
  }
  await batch.commit();
  return cities.length;
}

export async function syncBusAliases(aliases: BusAliasRecord[]): Promise<number> {
  if (!isAdminEnvConfigured()) return aliases.length;
  const db = await getSafeAdminDb();
  if (!db) return 0;

  const batch = db.batch();
  const now = new Date().toISOString();
  for (const alias of aliases) {
    const ref = db.collection(COLLECTIONS.aliases).doc(alias.id);
    batch.set(ref, sanitize({ ...alias, syncedAt: now }), { merge: true });
  }
  await batch.commit();
  return aliases.length;
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

export async function getBusCitiesLastSyncedAt(): Promise<string | null> {
  const cities = await getBusCitiesFromDb();
  if (!cities.length) return null;
  return cities.reduce((latest, c) => (c.syncedAt > latest ? c.syncedAt : latest), cities[0].syncedAt);
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
