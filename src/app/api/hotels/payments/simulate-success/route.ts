import { z } from "zod";
import { confirmHotelAfterPayment } from "@/lib/hotels/booking-service";
import { getHotelBookingById } from "@/lib/hotels/firestore";
import { hotelApiError } from "@/lib/hotels/api-helpers";
import { isHotelTestBookingEnabled, buildTestRazorpayIds } from "@/lib/hotels/test-booking";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  bookingId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    if (!isHotelTestBookingEnabled()) {
      return apiError("Test booking mode is disabled", 403);
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const booking = await getHotelBookingById(parsed.data.bookingId);
    if (!booking) return apiError("Booking not found", 404);

    const testIds = buildTestRazorpayIds(booking.bookingId);

    const confirmed = await confirmHotelAfterPayment({
      bookingId: booking.bookingId,
      razorpayOrderId: testIds.razorpayOrderId,
      razorpayPaymentId: testIds.razorpayPaymentId,
    });

    return apiSuccess({
      verified: true,
      booking: confirmed,
      testMode: true,
      manualReview: confirmed.status === "manual_review_required",
      message:
        confirmed.status === "confirmed"
          ? "Test payment — hotel booking confirmed"
          : "Test payment received. Confirmation pending.",
    });
  } catch (err) {
    return hotelApiError(err, "Test payment simulation failed");
  }
}
