import "server-only";

import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import {
  TRIPJACK_HOTEL_API_LOGS_COLLECTION,
  TRIPJACK_HOTEL_NATIONALITIES_COLLECTION,
  TRIPJACK_HOTEL_OPS_META_DOC,
  TRIPJACK_HOTEL_SYNC_LOGS_COLLECTION,
  type TripJackHotelApiLog,
  type TripJackHotelNationality,
  type TripJackHotelOpsMeta,
  type TripJackHotelSyncLog,
} from "@/lib/tripjack-hotels/catalog-types";

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const SENSITIVE_KEYS = new Set([
  "apikey",
  "api_key",
  "apiKey",
  "password",
  "secret",
  "razorpaySignature",
  "pan",
  "passportNumber",
]);

export function sanitizeLogPayload(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitizeLogPayload);
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key)) {
      out[key] = "[REDACTED]";
    } else if (typeof val === "object") {
      out[key] = sanitizeLogPayload(val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

export async function logTripJackHotelApiCall(
  input: Omit<TripJackHotelApiLog, "id" | "createdAt">
): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    const id = `htllog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const log: TripJackHotelApiLog = {
      id,
      ...input,
      requestBody: sanitizeLogPayload(input.requestBody),
      responseBody: sanitizeLogPayload(input.responseBody),
      createdAt: new Date().toISOString(),
    };
    await db.collection(TRIPJACK_HOTEL_API_LOGS_COLLECTION).doc(id).set(sanitize(log));
  } catch (error) {
    console.warn("[tripjack-hotels] logTripJackHotelApiCall failed:", error);
  }
}

export async function createTripJackHotelSyncLog(
  input: Omit<TripJackHotelSyncLog, "id">
): Promise<string> {
  const id = `htlsync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  if (!isAdminEnvConfigured()) return id;
  const db = await getSafeAdminDb();
  if (!db) return id;
  await db.collection(TRIPJACK_HOTEL_SYNC_LOGS_COLLECTION).doc(id).set(sanitize({ id, ...input }));
  return id;
}

export async function updateTripJackHotelSyncLog(
  id: string,
  patch: Partial<TripJackHotelSyncLog>
): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  const db = await getSafeAdminDb();
  if (!db) return;
  await db.collection(TRIPJACK_HOTEL_SYNC_LOGS_COLLECTION).doc(id).set(sanitize(patch), { merge: true });
}

export async function listTripJackHotelSyncLogs(limit = 20): Promise<TripJackHotelSyncLog[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(TRIPJACK_HOTEL_SYNC_LOGS_COLLECTION)
    .orderBy("startedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as TripJackHotelSyncLog);
}

export async function listTripJackHotelApiLogs(filters?: {
  limit?: number;
  endpoint?: string;
  bookingId?: string;
}): Promise<TripJackHotelApiLog[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];
  const limit = filters?.limit ?? 50;
  let query = db.collection(TRIPJACK_HOTEL_API_LOGS_COLLECTION).orderBy("createdAt", "desc");
  const snap = await query.limit(Math.min(limit * 3, 200)).get();
  let logs = snap.docs.map((d) => d.data() as TripJackHotelApiLog);
  if (filters?.endpoint) {
    logs = logs.filter((l) => l.endpoint.includes(filters.endpoint!));
  }
  if (filters?.bookingId) {
    logs = logs.filter((l) => l.bookingId === filters.bookingId);
  }
  return logs.slice(0, limit);
}

export async function upsertTripJackHotelNationalities(
  entries: TripJackHotelNationality[]
): Promise<number> {
  if (!entries.length || !isAdminEnvConfigured()) return 0;
  const db = await getSafeAdminDb();
  if (!db) return 0;
  let written = 0;
  for (let i = 0; i < entries.length; i += 400) {
    const chunk = entries.slice(i, i + 400);
    const batch = db.batch();
    for (const entry of chunk) {
      batch.set(
        db.collection(TRIPJACK_HOTEL_NATIONALITIES_COLLECTION).doc(entry.id),
        sanitize(entry),
        { merge: true }
      );
    }
    await batch.commit();
    written += chunk.length;
  }
  return written;
}

export async function listTripJackHotelNationalities(limit = 300): Promise<TripJackHotelNationality[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];
  const snap = await db
    .collection(TRIPJACK_HOTEL_NATIONALITIES_COLLECTION)
    .orderBy("name")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as TripJackHotelNationality);
}

const DEFAULT_OPS: TripJackHotelOpsMeta = {
  lastBookingStatusSyncAt: null,
  liveBookingEnabled: false,
  lastNationalitySyncAt: null,
  updatedAt: new Date().toISOString(),
};

export async function getTripJackHotelOpsMeta(): Promise<TripJackHotelOpsMeta> {
  if (!isAdminEnvConfigured()) return DEFAULT_OPS;
  const db = await getSafeAdminDb();
  if (!db) return DEFAULT_OPS;
  const snap = await db.doc(TRIPJACK_HOTEL_OPS_META_DOC).get();
  if (!snap.exists) return DEFAULT_OPS;
  return { ...DEFAULT_OPS, ...(snap.data() as TripJackHotelOpsMeta) };
}

export async function updateTripJackHotelOpsMeta(
  patch: Partial<TripJackHotelOpsMeta>
): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  const db = await getSafeAdminDb();
  if (!db) return;
  await db.doc(TRIPJACK_HOTEL_OPS_META_DOC).set(
    sanitize({ ...patch, updatedAt: new Date().toISOString() }),
    { merge: true }
  );
}

export async function countRecentTripJackHotelApiErrors(sinceIso: string): Promise<number> {
  if (!isAdminEnvConfigured()) return 0;
  const db = await getSafeAdminDb();
  if (!db) return 0;
  const snap = await db
    .collection(TRIPJACK_HOTEL_API_LOGS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(200)
    .get();
  return snap.docs
    .map((d) => d.data() as TripJackHotelApiLog)
    .filter((l) => !l.success && l.createdAt >= sinceIso).length;
}
