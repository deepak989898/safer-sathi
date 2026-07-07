import { z } from "zod";
import { canAccessHotelBooking } from "@/lib/hotels/booking-access";
import { hotelApiError } from "@/lib/hotels/api-helpers";
import { canCancelHotelBooking, estimateHotelCancellationCharge } from "@/lib/hotels/post-booking-service";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await canAccessHotelBooking(request, id);
    if ("error" in access) return access.error;

    const estimate = estimateHotelCancellationCharge(access.booking);
    return apiSuccess({
      booking: access.booking,
      estimate,
      canCancel: canCancelHotelBooking(access.booking),
    });
  } catch (err) {
    return hotelApiError(err, "Failed to load cancellation estimate");
  }
}

const schema = z.object({
  remarks: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await canAccessHotelBooking(request, id);
    if ("error" in access) return access.error;

    if (!canCancelHotelBooking(access.booking)) {
      return apiError("This booking cannot be cancelled", 400, { code: "CANCELLATION_NOT_ALLOWED" });
    }

    const { data: body } = await parseJsonBody(request);
    const parsed = schema.safeParse(body ?? {});
    const remarks = parsed.success ? parsed.data.remarks : undefined;

    const auth = await optionalAuthenticateRequest(request);
    const requestedBy = auth?.email ?? auth?.id ?? "customer";

    const { submitHotelCancellation } = await import("@/lib/hotels/post-booking-service");
    const booking = await submitHotelCancellation(id, { remarks, requestedBy });

    const includeDebug = auth?.role === "super_admin";
    return apiSuccess({
      booking,
      message: "Cancellation submitted",
      ...(includeDebug ? { debug: { cancellationResponse: booking.cancellationResponse } } : {}),
    });
  } catch (err) {
    return hotelApiError(err, "Failed to cancel booking");
  }
}
