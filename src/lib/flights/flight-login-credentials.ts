import type { FlightBookingRecord } from "@/lib/flights/types";

export function resolveFlightLoginCredentials(booking: FlightBookingRecord): {
  loginEmail: string;
  loginPassword: string;
} {
  return {
    loginEmail: booking.customerEmail.toLowerCase().trim(),
    loginPassword: booking.bookingId.trim(),
  };
}
