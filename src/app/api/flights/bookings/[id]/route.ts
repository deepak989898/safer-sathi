import { z } from "zod";
import {
  canAccessFlightBooking,
  requireFlightBookingStaff,
} from "@/lib/flights/booking-access";
import { flightApiError } from "@/lib/flights/api-helpers";
import {
  pollFlightAmendment,
  refreshFlightBookingDetails,
  releaseFlightPnr,
} from "@/lib/flights/post-booking-service";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await canAccessFlightBooking(request, id);
    if ("error" in access) return access.error;

    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    return apiSuccess({
      booking: access.booking,
      ...(includeDebug
        ? {
            debug: {
              bookingDetailResponse: access.booking.bookingDetailResponse,
              getChargesResponse: access.booking.getChargesResponse,
              submitAmendmentResponse: access.booking.submitAmendmentResponse,
              pollAmendmentResponse: access.booking.pollAmendmentResponse,
              releasePnrResponse: access.booking.releasePnrResponse,
            },
          }
        : {}),
    });
  } catch (err) {
    return flightApiError(err, "Failed to load booking");
  }
}

const patchSchema = z.object({
  action: z.enum(["retry_poll", "retry_booking_detail", "retry_release_pnr"]),
});

/** Admin-only retries. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await requireFlightBookingStaff(request, id);
    if ("error" in access) return access.error;

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    let booking = access.booking;
    if (parsed.data.action === "retry_poll") {
      booking = await pollFlightAmendment(id);
    } else if (parsed.data.action === "retry_booking_detail") {
      booking = await refreshFlightBookingDetails(id);
    } else if (parsed.data.action === "retry_release_pnr") {
      booking = await releaseFlightPnr(id);
    }

    return apiSuccess({ booking });
  } catch (err) {
    return flightApiError(err, "Admin action failed");
  }
}
