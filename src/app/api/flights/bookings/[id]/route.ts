import { getFlightBookingById } from "@/lib/flights/firestore";
import { flightApiError } from "@/lib/flights/api-helpers";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { requireStaffAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";

async function canAccessFlightBooking(
  request: Request,
  bookingId: string
): Promise<
  { booking: NonNullable<Awaited<ReturnType<typeof getFlightBookingById>>> } | { error: Response }
> {
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

  // Paid tickets are reachable by opaque bookingId (post-payment ticket page).
  const paidStatuses = new Set([
    "payment_success",
    "booking_pending",
    "confirmed",
    "manual_review_required",
  ]);
  if (booking.paymentStatus === "paid" || paidStatuses.has(booking.status)) {
    return { booking };
  }

  return { error: apiError("Unauthorized", 401) };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await canAccessFlightBooking(request, id);
    if ("error" in access) return access.error;
    return apiSuccess({ booking: access.booking });
  } catch (err) {
    return flightApiError(err, "Failed to load booking");
  }
}
