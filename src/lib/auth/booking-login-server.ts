import { getSafeAdminDb } from "@/lib/firebase/admin-safe";
import type { Booking } from "@/types";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function normalizeBookingNumber(bookingNumber: string): string {
  return bookingNumber.trim().toUpperCase();
}

function resolveBookingLoginExpiry(booking: Booking): Date | null {
  const start = booking.startDate?.trim();
  if (!start) return null;
  // For non-flight package/vehicle/hotel generic bookings, allow till start-date end.
  const dt = new Date(`${start.slice(0, 10)}T23:59:59`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function isEligibleForLogin(booking: Booking): boolean {
  const expiry = resolveBookingLoginExpiry(booking);
  if (expiry && Date.now() > expiry.getTime()) return false;
  return (
    booking.status === "confirmed" ||
    booking.paymentStatus === "paid" ||
    booking.paymentStatus === "partial"
  );
}

async function loadRecentBookings(limit = 500): Promise<Booking[]> {
  const db = await getSafeAdminDb();
  if (!db) return [];

  try {
    const snap = await db.collection("bookings").orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((doc) => doc.data() as Booking);
  } catch {
    try {
      const snap = await db.collection("bookings").limit(limit).get();
      return snap.docs
        .map((doc) => doc.data() as Booking)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      return [];
    }
  }
}

/** Find a confirmed booking matching email + booking ID password. Server-only. */
export async function findBookingForLogin(
  email: string,
  bookingNumber: string
): Promise<Booking | null> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedNumber = normalizeBookingNumber(bookingNumber);

  const db = await getSafeAdminDb();
  if (!db) return null;

  try {
    const byNumber = await db
      .collection("bookings")
      .where("bookingNumber", "==", normalizedNumber)
      .limit(20)
      .get();

    const exactFromQuery = byNumber.docs
      .map((doc) => doc.data() as Booking)
      .filter(
        (booking) =>
          isEligibleForLogin(booking) &&
          normalizeEmail(booking.customerEmail) === normalizedEmail
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    if (exactFromQuery) return exactFromQuery;
  } catch (error) {
    console.warn("findBookingForLogin query failed:", error);
  }

  const all = await loadRecentBookings();
  const forEmail = all
    .filter(
      (booking) =>
        isEligibleForLogin(booking) &&
        normalizeEmail(booking.customerEmail) === normalizedEmail
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (forEmail.length === 0) return null;

  const exact = forEmail.find(
    (booking) => normalizeBookingNumber(booking.bookingNumber) === normalizedNumber
  );
  if (exact) return exact;

  const latest = forEmail[0];
  if (normalizeBookingNumber(latest.bookingNumber) === normalizedNumber) {
    return latest;
  }

  return null;
}

/** Latest confirmed booking for an email (used to validate booking-ID password). */
export async function findLatestEligibleBookingForEmail(
  email: string
): Promise<Booking | null> {
  const normalizedEmail = normalizeEmail(email);
  const all = await loadRecentBookings();
  return (
    all
      .filter(
        (booking) =>
          isEligibleForLogin(booking) &&
          normalizeEmail(booking.customerEmail) === normalizedEmail
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null
  );
}
