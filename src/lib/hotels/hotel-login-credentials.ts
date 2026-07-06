import type { HotelBookingRecord } from "@/lib/hotels/types";

const HOTEL_BOOKING_ID_RE = /^hotel_\d+_[a-z0-9]+$/i;

export function isHotelBookingIdPassword(value: string): boolean {
  return HOTEL_BOOKING_ID_RE.test(value.trim());
}

export function resolveHotelLoginCredentials(
  booking: HotelBookingRecord
): { loginEmail: string; loginPassword: string } {
  return {
    loginEmail: booking.customerEmail.toLowerCase().trim(),
    loginPassword: booking.bookingId.trim(),
  };
}
