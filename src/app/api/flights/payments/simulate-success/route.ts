import { z } from "zod";
import { confirmFlightAfterPayment } from "@/lib/flights/booking-service";
import { getFlightBookingById, updateFlightBooking } from "@/lib/flights/firestore";
import { flightApiError } from "@/lib/flights/api-helpers";
import {
  buildTestRazorpayIds,
  isFlightTestBookingEnabled,
} from "@/lib/flights/test-booking";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  bookingId: z.string().min(1),
});

/**
 * Developer testing only.
 * Skips Razorpay and runs Book → Booking Details via confirmFlightAfterPayment.
 * Disabled automatically when NODE_ENV/VERCEL_ENV is production.
 */
export async function POST(request: Request) {
  try {
    if (!isFlightTestBookingEnabled()) {
      return apiError("Flight test booking is disabled", 403);
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const booking = await getFlightBookingById(parsed.data.bookingId);
    if (!booking) return apiError("Booking not found", 404);
    if (!booking.tripjackBookingId) {
      return apiError("TripJack booking ID missing. Cannot simulate payment.", 400);
    }

    const testIds = buildTestRazorpayIds(booking.bookingId);

    console.log("[flight-payment] TEST MODE simulate payment:", {
      bookingId: booking.bookingId,
      ...testIds,
    });

    let confirmed;
    try {
      confirmed = await confirmFlightAfterPayment({
        bookingId: booking.bookingId,
        razorpayOrderId: testIds.razorpayOrderId,
        razorpayPaymentId: testIds.razorpayPaymentId,
      });
    } catch (confirmError) {
      const message =
        confirmError instanceof Error ? confirmError.message : "Confirmation failed";
      console.error("[flight-payment] TEST MODE confirm failed:", message);
      confirmed = await updateFlightBooking(booking.bookingId, {
        status: "manual_review_required",
        paymentStatus: "paid",
        razorpayOrderId: testIds.razorpayOrderId,
        razorpayPaymentId: testIds.razorpayPaymentId,
        razorpaySignatureVerified: true,
        adminNotes: `TEST_BOOKING: ${message}`,
      });
      if (!confirmed) {
        confirmed = await getFlightBookingById(booking.bookingId);
      }
      return apiSuccess({
        verified: true,
        testMode: true,
        booking: confirmed,
        manualReview: true,
        message:
          "Payment received. Ticket confirmation is pending. Our team will verify and update shortly.",
        error: message,
      });
    }

    return apiSuccess({
      verified: true,
      testMode: true,
      booking: confirmed,
      manualReview:
        confirmed.status === "manual_review_required" ||
        confirmed.status === "booking_pending",
      message:
        confirmed.status === "manual_review_required" ||
        confirmed.status === "booking_pending"
          ? "Payment received. Ticket confirmation is pending. Our team will verify and update shortly."
          : confirmed.status === "confirmed"
            ? "Flight booking confirmed (test mode)"
            : "Booking in progress (test mode)",
    });
  } catch (err) {
    return flightApiError(err, "Test payment simulation failed");
  }
}
