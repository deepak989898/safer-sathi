import { z } from "zod";
import { canAccessHotelBooking } from "@/lib/hotels/booking-access";
import { hotelApiError } from "@/lib/hotels/api-helpers";
import { resendHotelBookingEmail } from "@/lib/hotels/notifications";
import { updateHotelBooking } from "@/lib/hotels/firestore";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  type: z.enum(["confirmation", "voucher"]).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await canAccessHotelBooking(request, id);
    if ("error" in access) return access.error;

    if (access.booking.paymentStatus !== "paid") {
      return apiError("Email available after payment", 400);
    }

    const { data: body } = await parseJsonBody(request);
    const parsed = schema.safeParse(body ?? {});
    const type = parsed.success ? parsed.data.type ?? "confirmation" : "confirmation";

    await resendHotelBookingEmail(access.booking, type);

    const field = type === "voucher" ? "voucherEmailSentAt" : "emailSentAt";
    await updateHotelBooking(id, { [field]: new Date().toISOString() });

    return apiSuccess({ message: `${type} email sent` });
  } catch (err) {
    return hotelApiError(err, "Failed to resend email");
  }
}
