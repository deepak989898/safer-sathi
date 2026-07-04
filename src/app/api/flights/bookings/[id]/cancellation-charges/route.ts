import { z } from "zod";
import { canAccessFlightBooking } from "@/lib/flights/booking-access";
import { flightApiError } from "@/lib/flights/api-helpers";
import { canCancelBooking } from "@/lib/flights/booking-guards";
import { getFlightCancellationCharges } from "@/lib/flights/post-booking-service";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
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

    const result = await getFlightCancellationCharges(id, remarks);
    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    return apiSuccess({
      booking: result.booking,
      charges: result.charges,
      ...(includeDebug
        ? { debug: { getChargesResponse: result.booking.getChargesResponse } }
        : {}),
    });
  } catch (err) {
    return flightApiError(err, "Failed to load cancellation charges");
  }
}
