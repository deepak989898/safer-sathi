import { z } from "zod";
import { confirmHotelAfterPayment } from "@/lib/hotels/booking-service";
import { getHotelBookingById, updateHotelBooking } from "@/lib/hotels/firestore";
import { ensureHotelGuestCustomerAccess } from "@/lib/hotels/hotel-guest-access";
import { assertTripJackHotelBookingAllowed, hotelApiError } from "@/lib/hotels/api-helpers";
import { verifyPayment } from "@/lib/payments/razorpay";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  bookingId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const existing = await getHotelBookingById(parsed.data.bookingId);
    if (!existing) return apiError("Booking not found", 404);

    const bookingAllowed = await assertTripJackHotelBookingAllowed();
    if ("error" in bookingAllowed) return bookingAllowed.error;

    if (
      existing.paymentStatus === "paid" &&
      existing.razorpayPaymentId === parsed.data.razorpayPaymentId
    ) {
      return apiSuccess({
        verified: true,
        booking: existing,
        manualReview: existing.status === "manual_review_required",
        message: "Payment already processed",
        duplicate: true,
      });
    }

    const verified = verifyPayment({
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      razorpaySignature: parsed.data.razorpaySignature,
    });

    if (!verified) {
      await updateHotelBooking(parsed.data.bookingId, {
        status: "payment_failed",
        paymentStatus: "failed",
      });
      return apiError("Payment verification failed", 400);
    }

    console.log("[hotel-payment] verified payment:", {
      bookingId: parsed.data.bookingId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
    });

    let booking;
    try {
      booking = await confirmHotelAfterPayment({
        bookingId: parsed.data.bookingId,
        razorpayOrderId: parsed.data.razorpayOrderId,
        razorpayPaymentId: parsed.data.razorpayPaymentId,
      });
    } catch (confirmError) {
      const message =
        confirmError instanceof Error ? confirmError.message : "Confirmation failed";
      booking = await updateHotelBooking(parsed.data.bookingId, {
        status: "booking_pending",
        paymentStatus: "paid",
        razorpayOrderId: parsed.data.razorpayOrderId,
        razorpayPaymentId: parsed.data.razorpayPaymentId,
        razorpaySignatureVerified: true,
        adminNotes: message,
      });
      if (!booking) {
        booking = await getHotelBookingById(parsed.data.bookingId);
      }
      return apiSuccess({
        verified: true,
        booking,
        manualReview: false,
        pendingConfirmation: true,
        message:
          "Payment received. Booking confirmation is in progress. We will notify you once confirmed.",
        error: message,
      });
    }

    return apiSuccess({
      verified: true,
      booking,
      manualReview:
        booking.status === "manual_review_required" || booking.status === "booking_pending",
      message:
        booking.status === "confirmed"
          ? "Hotel booking confirmed"
          : booking.status === "booking_pending"
            ? "Payment received. Booking confirmation is in progress."
            : "Booking in progress",
      loginCredentials: (await ensureHotelGuestCustomerAccess(booking)).loginCredentials,
    });
  } catch (err) {
    return hotelApiError(err, "Payment verification failed");
  }
}
