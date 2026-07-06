import type { Booking } from "@/types";
import type { BookingLoginProvision } from "./booking-customer-access";

const BOOKING_NUMBER_RE = /^SS-\d{4}-\d{4,}$/i;
const FLIGHT_BOOKING_ID_RE = /^flight_\d+_[a-z0-9]+$/i;

export function isFlightBookingIdPassword(value: string): boolean {
  return FLIGHT_BOOKING_ID_RE.test(value.trim());
}

export function isBookingIdPassword(value: string): boolean {
  const trimmed = value.trim();
  return BOOKING_NUMBER_RE.test(trimmed) || isFlightBookingIdPassword(trimmed);
}

export function normalizeBookingLoginPassword(value: string): string {
  const trimmed = value.trim();
  return isFlightBookingIdPassword(trimmed) ? trimmed : trimmed.toUpperCase();
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
