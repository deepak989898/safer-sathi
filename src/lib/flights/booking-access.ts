import { getFlightBookingById } from "@/lib/flights/firestore";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { requireStaffAuth } from "@/lib/admin/api-auth";
import { apiError } from "@/lib/api-response";
import type { FlightBookingRecord } from "@/lib/flights/types";

export async function canAccessFlightBooking(
  request: Request,
  bookingId: string
): Promise<{ booking: FlightBookingRecord } | { error: Response }> {
  const booking = await getFlightBookingById(bookingId);
  if (!booking) return { error: apiError("Booking not found", 404) };

  const staff = await requireStaffAuth(request);
  if (!("error" in staff)) return { booking };

  const auth = await optionalAuthenticateRequest(request);
  if (
    auth &&
    (booking.userId === auth.id ||
      booking.customerEmail.toLowerCase() === auth.email?.toLowerCase())
  ) {
    return { booking };
  }

  const openStatuses = new Set([
    "payment_success",
    "booking_pending",
    "confirmed",
    "manual_review_required",
    "cancellation_requested",
    "cancelled",
    "refund_pending",
    "refund_completed",
    "hold",
    "released",
  ]);
  if (booking.paymentStatus === "paid" || openStatuses.has(booking.status)) {
    return { booking };
  }

  return { error: apiError("Unauthorized", 401) };
}

export async function requireFlightBookingStaff(
  request: Request,
  bookingId: string
): Promise<{ booking: FlightBookingRecord } | { error: Response }> {
  const staff = await requireStaffAuth(request);
  if ("error" in staff) return { error: staff.error };

  const booking = await getFlightBookingById(bookingId);
  if (!booking) return { error: apiError("Booking not found", 404) };
  return { booking };
}
