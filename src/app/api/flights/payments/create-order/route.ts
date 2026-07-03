import { z } from "zod";
import { getFlightBookingById, updateFlightBooking } from "@/lib/flights/firestore";
import { flightApiError } from "@/lib/flights/api-helpers";
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
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const booking = await getFlightBookingById(parsed.data.bookingId);
    if (!booking) return apiError("Booking not found", 404);
    if (!booking.tripjackBookingId) {
      return apiError("TripJack booking ID missing. Cannot accept payment.", 400);
    }

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
    });
  } catch (err) {
    return flightApiError(err, "Failed to create payment order");
  }
}
