import { z } from "zod";
import { canAccessFlightBooking } from "@/lib/flights/booking-access";
import { flightApiError } from "@/lib/flights/api-helpers";
import { canCancelBooking } from "@/lib/flights/booking-guards";
import { submitFlightCancellation } from "@/lib/flights/post-booking-service";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  remarks: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await canAccessFlightBooking(request, id);
    if ("error" in access) return access.error;

    if (!canCancelBooking(access.booking)) {
      return apiError("This booking cannot be cancelled", 400);
    }

    const { data: body } = await parseJsonBody(request);
    const parsed = schema.safeParse(body ?? {});
    const remarks = parsed.success ? parsed.data.remarks : undefined;

    const booking = await submitFlightCancellation(id, remarks);
    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = auth?.role === "super_admin";

    return apiSuccess({
      booking,
      message:
        booking.status === "cancelled" || booking.status === "refund_completed"
          ? "Cancellation confirmed"
          : "Cancellation requested",
      ...(includeDebug
        ? { debug: { submitAmendmentResponse: booking.submitAmendmentResponse } }
        : {}),
    });
  } catch (err) {
    return flightApiError(err, "Failed to submit cancellation");
  }
}
