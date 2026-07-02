import { z } from "zod";
import { getBusBookingById, updateBusBooking } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { extractUpdatedFareTotal } from "@/lib/bus/fare-utils";
import {
  createOrder,
  getPaymentGatewayError,
  getPublicRazorpayKeyId,
  isDemoPaymentAllowed,
  isRazorpayConfigured,
} from "@/lib/payments/razorpay";
import { getUpdatedFare } from "@/lib/seatseller/client";
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

    let payableAmount = booking.totalFare;

    if (booking.callFareBreakupApi && booking.blockKey) {
      try {
        const updatedFareRaw = await getUpdatedFare(booking.blockKey, booking.bookingId);
        const updatedTotal = extractUpdatedFareTotal(updatedFareRaw);
        if (updatedTotal && updatedTotal > 0) {
          payableAmount = updatedTotal;
          await updateBusBooking(booking.bookingId, {
            totalFare: payableAmount,
            apiResponses: {
              ...booking.apiResponses,
              prePaymentUpdatedFare: updatedFareRaw,
            },
          });
        }
      } catch (fareError) {
        console.warn("[bus-payment] updated fare failed, using blocked fare", fareError);
      }
    }

    if (!isRazorpayConfigured() && !isDemoPaymentAllowed()) {
      return apiError(getPaymentGatewayError(), 503);
    }

    const order = await createOrder({
      amount: payableAmount,
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
      amount: payableAmount,
      bookingId: booking.bookingId,
    });
  } catch (error) {
    return busApiError(error, "Failed to create payment order");
  }
}
