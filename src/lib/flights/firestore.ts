import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import type { FlightBookingRecord, FlightBookingStatus } from "@/lib/flights/types";

const COLLECTIONS = {
  bookings: "flightBookings",
} as const;

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function generateFlightBookingId(): string {
  return `flight_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createFlightBooking(
  record: FlightBookingRecord
): Promise<FlightBookingRecord> {
  if (!isAdminEnvConfigured()) return record;
  const db = await getSafeAdminDb();
  if (!db) return record;
  await db.collection(COLLECTIONS.bookings).doc(record.bookingId).set(sanitize(record));
  return record;
}

export async function updateFlightBooking(
  bookingId: string,
  updates: Partial<FlightBookingRecord>
): Promise<FlightBookingRecord | null> {
  const existing = await getFlightBookingById(bookingId);
  if (!existing) return null;
  const updated: FlightBookingRecord = {
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

export async function getFlightBookingById(
  bookingId: string
): Promise<FlightBookingRecord | null> {
  if (!isAdminEnvConfigured()) return null;
  const db = await getSafeAdminDb();
  if (!db) return null;
  const doc = await db.collection(COLLECTIONS.bookings).doc(bookingId).get();
  if (!doc.exists) return null;
  return doc.data() as FlightBookingRecord;
}

export async function listFlightBookings(filters?: {
  userId?: string;
  email?: string;
  status?: FlightBookingStatus;
  limit?: number;
}): Promise<FlightBookingRecord[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  let query = db.collection(COLLECTIONS.bookings).orderBy("createdAt", "desc");
  if (filters?.status) {
    query = query.where("status", "==", filters.status) as typeof query;
  }
  const snap = await query.limit(filters?.limit ?? 50).get();
  let bookings = snap.docs.map((d) => d.data() as FlightBookingRecord);

  if (filters?.userId) {
    bookings = bookings.filter((b) => b.userId === filters.userId);
  }
  if (filters?.email) {
    const email = filters.email.toLowerCase();
    bookings = bookings.filter((b) => b.customerEmail.toLowerCase() === email);
  }

  return bookings;
}

export async function listAllFlightBookingsForAdmin(
  limit = 500
): Promise<FlightBookingRecord[]> {
  return listFlightBookings({ limit });
}
