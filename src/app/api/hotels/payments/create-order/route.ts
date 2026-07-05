import { z } from "zod";
import { getHotelBookingById, updateHotelBooking } from "@/lib/hotels/firestore";
import { assertTripJackHotelBookingAllowed, hotelApiError } from "@/lib/hotels/api-helpers";
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

    const booking = await getHotelBookingById(parsed.data.bookingId);
    if (!booking) return apiError("Booking not found", 404);

    const bookingAllowed = await assertTripJackHotelBookingAllowed();
    if ("error" in bookingAllowed) return bookingAllowed.error;

    if (!booking.tripjackBookingId) {
      return apiError("TripJack booking ID missing. Cannot accept payment.", 400);
    }
    if (booking.paymentStatus === "paid") {
      return apiError("Payment already completed for this booking", 400);
    }

    if (!isRazorpayConfigured() && !isDemoPaymentAllowed()) {
      return apiError(getPaymentGatewayError(), 503);
    }

    const order = await createOrder({
      amount: booking.totalFare,
      receipt: booking.bookingId,
      notes: {
        purpose: "hotel_booking",
        bookingId: booking.bookingId,
        tripjackBookingId: booking.tripjackBookingId,
      },
    });

    await updateHotelBooking(booking.bookingId, {
      status: "payment_pending",
      razorpayOrderId: order.orderId,
    });

    console.log("[hotel-payment] created Razorpay order:", {
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
    return hotelApiError(err, "Failed to create payment order");
  }
}
