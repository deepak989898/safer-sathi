import { getHotelBookingById } from "@/lib/hotels/firestore";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { requireStaffAuth } from "@/lib/admin/api-auth";
import { apiError } from "@/lib/api-response";
import type { HotelBookingRecord } from "@/lib/hotels/types";

export async function canAccessHotelBooking(
  request: Request,
  bookingId: string
): Promise<{ booking: HotelBookingRecord } | { error: Response }> {
  const booking = await getHotelBookingById(bookingId);
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
    "cancelled",
    "refund_pending",
    "refunded",
  ]);

  if (booking.paymentStatus === "paid" || openStatuses.has(booking.status)) {
    return { booking };
  }

  return { error: apiError("Unauthorized", 401) };
}
