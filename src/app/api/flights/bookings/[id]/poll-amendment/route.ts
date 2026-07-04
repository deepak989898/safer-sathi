import { canAccessFlightBooking } from "@/lib/flights/booking-access";
import { flightApiError } from "@/lib/flights/api-helpers";
import { pollFlightAmendment } from "@/lib/flights/post-booking-service";
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

    if (!access.booking.amendmentId) {
      return apiError("No amendment in progress for this booking", 400);
    }

    const booking = await pollFlightAmendment(id);
    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    return apiSuccess({
      booking,
      ...(includeDebug
        ? { debug: { pollAmendmentResponse: booking.pollAmendmentResponse } }
        : {}),
    });
  } catch (err) {
    return flightApiError(err, "Failed to poll amendment status");
  }
}
