import { canAccessFlightBooking } from "@/lib/flights/booking-access";
import { flightApiError } from "@/lib/flights/api-helpers";
import { canReleasePnr } from "@/lib/flights/booking-guards";
import { releaseFlightPnr } from "@/lib/flights/post-booking-service";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await canAccessFlightBooking(request, id);
    if ("error" in access) return access.error;

    if (!canReleasePnr(access.booking)) {
      return apiError(
        "Release PNR is only available for unpaid hold bookings",
        400
      );
    }

    const booking = await releaseFlightPnr(id);
    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    return apiSuccess({
      booking,
      ...(includeDebug
        ? { debug: { releasePnrResponse: booking.releasePnrResponse } }
        : {}),
    });
  } catch (err) {
    return flightApiError(err, "Failed to release PNR");
  }
}
