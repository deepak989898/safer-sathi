import { getSafeAdminDb } from "@/lib/firebase/admin-safe";
import type { FlightBookingRecord } from "@/lib/flights/types";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function isEligibleForLogin(booking: FlightBookingRecord): boolean {
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
