import type { Booking } from "@/types";
import type { BookingLoginProvision } from "./booking-customer-access";

const BOOKING_NUMBER_RE = /^SS-\d{4}-\d{4,}$/i;

export function isBookingIdPassword(value: string): boolean {
  return BOOKING_NUMBER_RE.test(value.trim());
}

export function resolveBookingLoginCredentials(
  booking: Booking,
  provision?: BookingLoginProvision | null
): { loginEmail: string; loginPassword: string } {
  return {
    loginEmail: (provision?.email ?? booking.customerEmail).toLowerCase().trim(),
    loginPassword:
      provision?.loginPassword ?? booking.bookingNumber.trim().toUpperCase(),
  };
}
