import { z } from "zod";
import { confirmBusTicketAfterPayment } from "@/lib/bus/booking-service";
import { getBusBookingById } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  bookingId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const existing = await getBusBookingById(parsed.data.bookingId);
    if (!existing) return apiError("Booking not found", 404);
    if (existing.status === "confirmed") {
      return apiSuccess({ booking: existing, alreadyConfirmed: true });
    }

    const booking = await confirmBusTicketAfterPayment(parsed.data);
    return apiSuccess({
      booking,
      manualReview: booking.status === "manual_review_required",
    });
  } catch (error) {
    return busApiError(error, "Ticket confirmation failed");
  }
}
