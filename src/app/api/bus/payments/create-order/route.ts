import { z } from "zod";
import { getBusBookingById, updateBusBooking } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
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

    const booking = await getBusBookingById(parsed.data.bookingId);
    if (!booking) return apiError("Booking not found", 404);
    if (!booking.blockKey) return apiError("Seats not blocked yet", 400);
    if (booking.blockExpiresAt && new Date(booking.blockExpiresAt) < new Date()) {
      return apiError("Seat block expired. Please search and select seats again.", 400);
    }

    if (!isRazorpayConfigured() && !isDemoPaymentAllowed()) {
      return apiError(getPaymentGatewayError(), 503);
    }

    const order = await createOrder({
      amount: booking.totalFare,
      receipt: booking.bookingId,
      notes: {
        purpose: "bus_booking",
        bookingId: booking.bookingId,
        blockKey: booking.blockKey,
      },
    });

    await updateBusBooking(booking.bookingId, {
      status: "payment_pending",
      razorpayOrderId: order.orderId,
    });

    return apiSuccess({
      ...order,
      id: order.orderId,
      keyId: getPublicRazorpayKeyId(),
      amount: booking.totalFare,
      bookingId: booking.bookingId,
    });
  } catch (error) {
    return busApiError(error, "Failed to create payment order");
  }
}
