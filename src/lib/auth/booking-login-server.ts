import { getSafeAdminDb } from "@/lib/firebase/admin-safe";
import type { Booking } from "@/types";

/** Find a confirmed booking matching email + booking ID password. Server-only. */
export async function findBookingForLogin(
  email: string,
  bookingNumber: string
): Promise<Booking | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedNumber = bookingNumber.trim().toUpperCase();

  const db = await getSafeAdminDb();
  if (!db) return null;

  const isEligible = (booking: Booking) =>
    booking.status === "confirmed" ||
    booking.paymentStatus === "paid" ||
    booking.paymentStatus === "partial";

  try {
    const byNumber = await db
      .collection("bookings")
      .where("bookingNumber", "==", normalizedNumber)
      .limit(10)
      .get();

    const exact = byNumber.docs
      .map((doc) => doc.data() as Booking)
      .filter(
        (b) =>
          isEligible(b) && b.customerEmail.toLowerCase().trim() === normalizedEmail
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

    if (exact) return exact;

    const byEmail = await db
      .collection("bookings")
      .where("customerEmail", "==", normalizedEmail)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const latest = byEmail.docs
      .map((doc) => doc.data() as Booking)
      .filter(isEligible);

    if (latest.length === 0) return null;

    const newest = latest[0];
    if (newest.bookingNumber.toUpperCase() === normalizedNumber) {
      return newest;
    }

    return null;
  } catch (error) {
    console.warn("findBookingForLogin failed:", error);
    try {
      const snap = await db.collection("bookings").limit(500).get();
      const all = snap.docs
        .map((doc) => doc.data() as Booking)
        .filter(
          (b) =>
            isEligible(b) &&
            b.customerEmail.toLowerCase().trim() === normalizedEmail &&
            b.bookingNumber.toUpperCase() === normalizedNumber
        );
      return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
    } catch {
      return null;
    }
  }
}
