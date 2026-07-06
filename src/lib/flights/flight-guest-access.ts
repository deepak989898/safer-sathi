import "server-only";

import { provisionGuestCustomerLogin } from "@/lib/auth/booking-customer-access";
import type { BookingLoginProvisionResult } from "@/lib/auth/booking-customer-access";
import { resolveFlightLoginCredentials } from "@/lib/flights/flight-login-credentials";
import { getFlightBookingById, updateFlightBooking } from "@/lib/flights/firestore";
import type { FlightBookingRecord } from "@/lib/flights/types";

export { resolveFlightLoginCredentials } from "@/lib/flights/flight-login-credentials";

export function shouldProvisionFlightGuestAccount(booking: FlightBookingRecord): boolean {
  if (booking.guestAccountProvisioned) return false;
  if (!booking.customerEmail?.trim()) return false;
  return !booking.userId || booking.userId === "guest";
}

export async function provisionFlightBookingLogin(
  booking: FlightBookingRecord
): Promise<BookingLoginProvisionResult> {
  const credentials = resolveFlightLoginCredentials(booking);

  const provision = await provisionGuestCustomerLogin({
    email: credentials.loginEmail,
    name: booking.customerName,
    phone: booking.customerMobile,
    loginPassword: credentials.loginPassword,
    totalSpent: booking.totalFare,
  });

  if (!provision.ok) {
    return provision;
  }

  await updateFlightBooking(booking.bookingId, {
    userId: provision.userId,
    guestAccountProvisioned: true,
    guestAccountCreated: provision.created,
  });

  return provision;
}

export async function ensureFlightGuestCustomerAccess(
  booking: FlightBookingRecord
): Promise<{
  booking: FlightBookingRecord;
  loginCredentials: { loginEmail: string; loginPassword: string } | null;
}> {
  if (!shouldProvisionFlightGuestAccount(booking)) {
    const credentials = booking.guestAccountProvisioned
      ? resolveFlightLoginCredentials(booking)
      : null;
    return { booking, loginCredentials: credentials };
  }

  const provision = await provisionFlightBookingLogin(booking);
  if (!provision.ok) {
    console.error("ensureFlightGuestCustomerAccess failed:", provision.reason, provision.code);
    return { booking, loginCredentials: null };
  }

  const fresh = await getFlightBookingById(booking.bookingId);
  const updated = fresh ?? {
    ...booking,
    userId: provision.userId,
    guestAccountProvisioned: true,
    guestAccountCreated: provision.created,
  };

  return {
    booking: updated,
    loginCredentials: {
      loginEmail: provision.email,
      loginPassword: provision.loginPassword,
    },
  };
}
