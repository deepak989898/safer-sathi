import { canAccessFlightBooking } from "@/lib/flights/booking-access";
import { flightApiError } from "@/lib/flights/api-helpers";
import { refreshFlightBookingDetails } from "@/lib/flights/post-booking-service";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiSuccess } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await canAccessFlightBooking(request, id);
    if ("error" in access) return access.error;

    const booking = await refreshFlightBookingDetails(id);
    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    return apiSuccess({
      booking,
      ...(includeDebug
        ? { debug: { bookingDetailResponse: booking.bookingDetailResponse } }
        : {}),
    });
  } catch (err) {
    return flightApiError(err, "Failed to refresh booking details");
  }
}
