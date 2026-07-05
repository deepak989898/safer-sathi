import { z } from "zod";
import { confirmFlightAfterPayment } from "@/lib/flights/booking-service";
import { getFlightBookingById, updateFlightBooking } from "@/lib/flights/firestore";
import { flightApiError } from "@/lib/flights/api-helpers";
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

    const verified = verifyPayment({
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
      razorpaySignature: parsed.data.razorpaySignature,
    });

    if (!verified) {
      console.warn("[flight-payment] signature verification failed:", parsed.data.bookingId);
      await updateFlightBooking(parsed.data.bookingId, {
        status: "payment_failed",
        paymentStatus: "failed",
      });
      return apiError("Payment verification failed", 400);
    }

    console.log("[flight-payment] verified payment:", {
      bookingId: parsed.data.bookingId,
      razorpayOrderId: parsed.data.razorpayOrderId,
      razorpayPaymentId: parsed.data.razorpayPaymentId,
    });

    let booking;
    try {
      booking = await confirmFlightAfterPayment({
        bookingId: parsed.data.bookingId,
        razorpayOrderId: parsed.data.razorpayOrderId,
        razorpayPaymentId: parsed.data.razorpayPaymentId,
      });
    } catch (confirmError) {
      const message =
        confirmError instanceof Error ? confirmError.message : "Confirmation failed";
      console.error("[flight-payment] post-payment booking confirm failed:", message);
      booking = await updateFlightBooking(parsed.data.bookingId, {
        status: "manual_review_required",
        paymentStatus: "paid",
        razorpayOrderId: parsed.data.razorpayOrderId,
        razorpayPaymentId: parsed.data.razorpayPaymentId,
        razorpaySignatureVerified: true,
        adminNotes: message,
      });
      if (!booking) {
        booking = await getFlightBookingById(parsed.data.bookingId);
      }
      return apiSuccess({
        verified: true,
        booking,
        manualReview: true,
        message:
          "Payment received. Ticket confirmation is pending. Our team will verify and update shortly.",
        error: message,
      });
    }

    return apiSuccess({
      verified: true,
      booking,
      manualReview:
        booking.status === "payment_received_booking_failed" ||
        booking.status === "manual_review_required" ||
        booking.status === "booking_pending",
      bookingFailed: booking.status === "payment_received_booking_failed",
      message:
        booking.status === "payment_received_booking_failed"
          ? "Payment received but TripJack booking failed. Our team has been notified and will retry."
          : booking.status === "manual_review_required" || booking.status === "booking_pending"
            ? "Payment received. Fetching your ticket from the airline…"
            : booking.status === "confirmed"
              ? "Flight booking confirmed"
              : "Booking in progress",
    });
  } catch (err) {
    return flightApiError(err, "Payment verification failed");
  }
}
