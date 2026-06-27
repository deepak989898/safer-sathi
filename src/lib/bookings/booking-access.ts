import { apiError } from "@/lib/api-response";
import {
  authenticateRequest,
  isStaffUser,
  optionalAuthenticateRequest,
  type AuthenticatedUser,
} from "@/lib/auth/server-auth";
import { requireBookingsStaffRole } from "@/lib/admin/api-auth";
import type { Booking } from "@/types";
import type { NextResponse } from "next/server";

export function canReadBooking(
  booking: Booking,
  user: AuthenticatedUser | null,
  guestEmail?: string | null,
  guestBookingNumber?: string | null
): boolean {
  if (user && isStaffUser(user) && requireBookingsStaffRole(user.role)) {
    return true;
  }
  if (user && booking.userId === user.id) {
    return true;
  }
  if (
    user &&
    user.role === "customer" &&
    booking.customerEmail.toLowerCase().trim() === user.email.toLowerCase().trim()
  ) {
    return true;
  }
  if (
    booking.userId === "guest" &&
    guestEmail &&
    guestEmail.toLowerCase().trim() === booking.customerEmail.toLowerCase().trim()
  ) {
    return true;
  }
  if (
    booking.userId === "guest" &&
    booking.status === "pending" &&
    guestBookingNumber &&
    guestBookingNumber.trim().toUpperCase() === booking.bookingNumber.toUpperCase()
  ) {
    return true;
  }
  return false;
}

export async function authorizeBookingRead(
  request: Request,
  booking: Booking
): Promise<{ user: AuthenticatedUser | null } | { error: NextResponse }> {
  const { searchParams } = new URL(request.url);
  const guestEmail = searchParams.get("email");
  const guestBookingNumber = searchParams.get("bookingNumber");
  const user = await optionalAuthenticateRequest(request);

  if (!canReadBooking(booking, user, guestEmail, guestBookingNumber)) {
    return { error: apiError("Unauthorized", 401) };
  }

  return { user };
}

export async function authorizeBookingsList(
  request: Request,
  requestedUserId?: string
): Promise<{ user: AuthenticatedUser; userId?: string } | { error: NextResponse }> {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth;

  if (isStaffUser(auth.user) && requireBookingsStaffRole(auth.user.role)) {
    return { user: auth.user, userId: requestedUserId };
  }

  if (auth.user.role === "customer") {
    if (requestedUserId && requestedUserId !== auth.user.id) {
      return { error: apiError("Forbidden", 403) };
    }
    return { user: auth.user, userId: auth.user.id };
  }

  return { error: apiError("Forbidden", 403) };
}
