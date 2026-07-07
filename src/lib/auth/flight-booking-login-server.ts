import { getSafeAdminDb } from "@/lib/firebase/admin-safe";
import type { FlightBookingRecord } from "@/lib/flights/types";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function resolveFlightLoginExpiry(booking: FlightBookingRecord): Date | null {
  const rawDate = booking.travelDate?.trim();
  if (!rawDate) return null;
  const rawTime = booking.departureTime?.trim();

  // If travelDate is already full datetime, use it directly.
  const direct = new Date(rawDate);
  if (!Number.isNaN(direct.getTime()) && /T|\d{2}:\d{2}/.test(rawDate)) {
    return direct;
  }

  const timeMatch = rawTime?.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hh = String(Number(timeMatch[1])).padStart(2, "0");
    const mm = timeMatch[2];
    const dt = new Date(`${rawDate.slice(0, 10)}T${hh}:${mm}:00`);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  // Fallback: valid through travel day end.
  const eod = new Date(`${rawDate.slice(0, 10)}T23:59:59`);
  return Number.isNaN(eod.getTime()) ? null : eod;
}

function isEligibleForLogin(booking: FlightBookingRecord): boolean {
  const expiry = resolveFlightLoginExpiry(booking);
  if (expiry && Date.now() > expiry.getTime()) return false;
  return (
    booking.paymentStatus === "paid" &&
    booking.status !== "payment_failed" &&
    booking.status !== "fare_validated"
  );
}

/** Find a paid flight booking matching email + flight booking ID password. */
export async function findFlightBookingForLogin(
  email: string,
  bookingId: string
): Promise<FlightBookingRecord | null> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedId = bookingId.trim();

  const db = await getSafeAdminDb();
  if (!db) return null;

  try {
    const doc = await db.collection("flightBookings").doc(normalizedId).get();
    if (!doc.exists) return null;
    const booking = doc.data() as FlightBookingRecord;
    if (normalizeEmail(booking.customerEmail) !== normalizedEmail) return null;
    if (!isEligibleForLogin(booking)) return null;
    return booking;
  } catch (error) {
    console.warn("findFlightBookingForLogin failed:", error);
    return null;
  }
}
