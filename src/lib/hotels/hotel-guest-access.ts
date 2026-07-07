import "server-only";

import { provisionGuestCustomerLogin } from "@/lib/auth/booking-customer-access";
import type { BookingLoginProvisionResult } from "@/lib/auth/booking-customer-access";
import { getHotelBookingById, updateHotelBooking } from "@/lib/hotels/firestore";
import { resolveHotelLoginCredentials } from "@/lib/hotels/hotel-login-credentials";
import type { HotelBookingRecord } from "@/lib/hotels/types";

export { resolveHotelLoginCredentials } from "@/lib/hotels/hotel-login-credentials";

export function shouldProvisionHotelGuestAccount(booking: HotelBookingRecord): boolean {
  if (booking.guestAccountProvisioned) return false;
  if (!booking.customerEmail?.trim()) return false;
  return !booking.userId || booking.userId === "guest";
}

export async function provisionHotelBookingLogin(
  booking: HotelBookingRecord
): Promise<BookingLoginProvisionResult> {
  const credentials = resolveHotelLoginCredentials(booking);

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

  await updateHotelBooking(booking.bookingId, {
    userId: provision.userId,
    guestAccountProvisioned: true,
    guestAccountCreated: provision.created,
  });

  return provision;
}

export async function ensureHotelGuestCustomerAccess(
  booking: HotelBookingRecord
): Promise<{
  booking: HotelBookingRecord;
  loginCredentials: { loginEmail: string; loginPassword: string } | null;
}> {
  const fallbackCredentials =
    booking.customerEmail?.trim() && booking.paymentStatus === "paid"
      ? resolveHotelLoginCredentials(booking)
      : null;

  if (!shouldProvisionHotelGuestAccount(booking)) {
    return { booking, loginCredentials: fallbackCredentials };
  }

  const provision = await provisionHotelBookingLogin(booking);
  if (!provision.ok) {
    console.error("ensureHotelGuestCustomerAccess failed:", provision.reason, provision.code);
    return { booking, loginCredentials: null };
  }

  const fresh = await getHotelBookingById(booking.bookingId);
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
