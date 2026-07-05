import { canAccessHotelBooking } from "@/lib/hotels/booking-access";
import { hotelApiError } from "@/lib/hotels/api-helpers";
import { refreshHotelBookingDetails } from "@/lib/hotels/post-booking-service";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiSuccess } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await canAccessHotelBooking(request, id);
    if ("error" in access) return access.error;

    const auth = await optionalAuthenticateRequest(request);
    const actionBy = auth?.email ?? auth?.id ?? "customer";

    const booking = await refreshHotelBookingDetails(id, actionBy);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    return apiSuccess({
      booking,
      ...(includeDebug ? { debug: { bookingDetailsResponse: booking.bookingDetailsResponse } } : {}),
    });
  } catch (err) {
    return hotelApiError(err, "Failed to refresh booking status");
  }
}
