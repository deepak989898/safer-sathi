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

function resolveHotelLoginExpiry(booking: HotelBookingRecord): Date | null {
  const checkIn = booking.checkIn?.trim();
  if (!checkIn) return null;
  const dt = new Date(`${checkIn.slice(0, 10)}T14:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

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
  const expiry = resolveHotelLoginExpiry(booking);
  if (expiry && Date.now() > expiry.getTime()) return null;
  if (!CONFIRMED_STATUSES.has(booking.status) && booking.paymentStatus !== "paid") {
    return null;
  }
  return booking;
}
