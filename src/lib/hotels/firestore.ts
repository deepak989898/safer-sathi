import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import type { HotelBookingRecord, HotelBookingStatus } from "@/lib/hotels/types";

const COLLECTION = "hotelBookings";

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function generateHotelBookingId(): string {
  return `hotel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createHotelBooking(record: HotelBookingRecord): Promise<HotelBookingRecord> {
  if (!isAdminEnvConfigured()) return record;
  const db = await getSafeAdminDb();
  if (!db) return record;
  await db.collection(COLLECTION).doc(record.bookingId).set(sanitize(record));
  return record;
}

export async function getHotelBookingById(bookingId: string): Promise<HotelBookingRecord | null> {
  if (!isAdminEnvConfigured()) return null;
  const db = await getSafeAdminDb();
  if (!db) return null;
  const doc = await db.collection(COLLECTION).doc(bookingId).get();
  if (!doc.exists) return null;
  return doc.data() as HotelBookingRecord;
}

export async function updateHotelBooking(
  bookingId: string,
  updates: Partial<HotelBookingRecord>
): Promise<HotelBookingRecord | null> {
  const existing = await getHotelBookingById(bookingId);
  if (!existing) return null;
  const updated: HotelBookingRecord = {
    ...existing,
    ...updates,
    bookingId: existing.bookingId,
    updatedAt: new Date().toISOString(),
  };
  if (!isAdminEnvConfigured()) return updated;
  const db = await getSafeAdminDb();
  if (!db) return updated;
  await db.collection(COLLECTION).doc(bookingId).set(sanitize(updated), { merge: true });
  return updated;
}

export async function listHotelBookings(filters?: {
  userId?: string;
  email?: string;
  status?: HotelBookingStatus;
  limit?: number;
}): Promise<HotelBookingRecord[]> {
  if (!isAdminEnvConfigured()) return [];
  const db = await getSafeAdminDb();
  if (!db) return [];

  let query = db.collection(COLLECTION).orderBy("createdAt", "desc");
  if (filters?.status) {
    query = query.where("status", "==", filters.status) as typeof query;
  }
  const snap = await query.limit(filters?.limit ?? 50).get();
  let bookings = snap.docs.map((d) => d.data() as HotelBookingRecord);

  if (filters?.userId) {
    bookings = bookings.filter((b) => b.userId === filters.userId);
  }
  if (filters?.email) {
    const email = filters.email.toLowerCase();
    bookings = bookings.filter((b) => b.customerEmail.toLowerCase() === email);
  }
  return bookings;
}

export async function listAllHotelBookingsForAdmin(limit = 500): Promise<HotelBookingRecord[]> {
  return listHotelBookings({ limit });
}
