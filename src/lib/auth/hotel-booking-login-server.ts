import "server-only";

import { getHotelBookingById } from "@/lib/hotels/firestore";
import { isHotelBookingIdPassword } from "@/lib/hotels/hotel-login-credentials";
import type { HotelBookingRecord } from "@/lib/hotels/types";

const CONFIRMED_STATUSES = new Set([
  "review_confirmed",
  "payment_pending",
  "payment_success",
  "booking_pending",
  "confirmed",
]);

export async function findHotelBookingForLogin(
  email: string,
  bookingId: string
): Promise<HotelBookingRecord | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedId = bookingId.trim();
  if (!isHotelBookingIdPassword(normalizedId)) return null;

  const booking = await getHotelBookingById(normalizedId);
  if (!booking) return null;
  if (booking.customerEmail.toLowerCase().trim() !== normalizedEmail) return null;
  if (!CONFIRMED_STATUSES.has(booking.status) && booking.paymentStatus !== "paid") {
    return null;
  }
  return booking;
}
