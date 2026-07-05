import { z } from "zod";
import { getFlightBookingById, updateFlightBooking } from "@/lib/flights/firestore";
import { flightApiError } from "@/lib/flights/api-helpers";
import { revalidateFlightFareBeforePayment } from "@/lib/flights/pre-payment-validate";
import {
  createOrder,
  getPaymentGatewayError,
  getPublicRazorpayKeyId,
  isDemoPaymentAllowed,
  isRazorpayConfigured,
} from "@/lib/payments/razorpay";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  bookingId: z.string().min(1),
  /** Customer accepted updated fare after pre-payment re-validation. */
  acceptFareChange: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    let booking = await getFlightBookingById(parsed.data.bookingId);
    if (!booking) return apiError("Booking not found", 404);
    if (!booking.tripjackBookingId && !booking.fareValidateNormalized?.bookingId) {
      return apiError("TripJack booking ID missing. Cannot accept payment.", 400);
    }

    const fareCheck = await revalidateFlightFareBeforePayment(booking);
    if (!fareCheck.ok) {
      return apiError(fareCheck.message, 409, {
        code: fareCheck.reason,
        fareUnavailable: fareCheck.reason === "unavailable",
      });
    }

    if (fareCheck.fareChanged && !parsed.data.acceptFareChange) {
      return apiError("Fare has changed. Please review and confirm before payment.", 409, {
        code: "fare_changed",
        fareChanged: true,
        previousFare: fareCheck.previousFare,
        newFare: fareCheck.validated.totalFare,
        booking: fareCheck.booking,
      });
    }

    booking = fareCheck.booking;

    if (!isRazorpayConfigured() && !isDemoPaymentAllowed()) {
      return apiError(getPaymentGatewayError(), 503);
    }

    const order = await createOrder({
      amount: booking.totalFare,
      receipt: booking.bookingId,
      notes: {
        purpose: "flight_booking",
        bookingId: booking.bookingId,
        tripjackBookingId: booking.tripjackBookingId,
      },
    });

    await updateFlightBooking(booking.bookingId, {
      status: "payment_pending",
      razorpayOrderId: order.orderId,
      tripjackBookingId: booking.tripjackBookingId || fareCheck.validated.bookingId,
    });

    console.log("[flight-payment] created Razorpay order:", {
      bookingId: booking.bookingId,
      orderId: order.orderId,
      amount: booking.totalFare,
    });

    return apiSuccess({
      ...order,
      id: order.orderId,
      keyId: getPublicRazorpayKeyId(),
      amount: booking.totalFare,
      bookingId: booking.bookingId,
      fareRevalidated: true,
    });
  } catch (err) {
    return flightApiError(err, "Failed to create payment order");
  }
}
