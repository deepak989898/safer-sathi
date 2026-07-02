import { z } from "zod";
import { confirmBusTicketAfterPayment } from "@/lib/bus/booking-service";
import { getBusBookingById, updateBusBooking } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { verifyPayment } from "@/lib/payments/razorpay";
import { sendBookingConfirmationNotifications } from "@/lib/bookings/booking-notifications";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import type { Booking } from "@/types";

const schema = z.object({
  bookingId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

function busBookingToLegacyBooking(bus: NonNullable<Awaited<ReturnType<typeof getBusBookingById>>>): Booking {
  const now = new Date().toISOString();
  return {
    id: bus.bookingId,
    bookingNumber: bus.tin ?? bus.bookingId.toUpperCase().slice(-8),
    userId: bus.userId,
    customerName: bus.customerName,
    customerEmail: bus.customerEmail,
    customerPhone: bus.customerMobile,
    serviceType: "bus",
    serviceId: bus.tripId,
    serviceName: {
      en: `${bus.operatorName} — ${bus.sourceCityName} to ${bus.destinationCityName}`,
      hi: `${bus.operatorName} — ${bus.sourceCityName} से ${bus.destinationCityName}`,
    },
    startDate: bus.doj,
    guests: bus.seatNames.length,
    amount: bus.totalFare,
    paidAmount: bus.totalFare,
    departure: bus.sourceCityName,
    destination: bus.destinationCityName,
    status: "confirmed",
    paymentStatus: "paid",
    aiProcessed: false,
    notes: `Bus TIN: ${bus.tin ?? "pending"} | PNR: ${bus.pnr ?? "pending"} | Seats: ${bus.seatNames.join(", ")}`,
    createdAt: bus.createdAt,
    updatedAt: now,
  };
}

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
      await updateBusBooking(parsed.data.bookingId, {
        status: "payment_failed",
        paymentStatus: "failed",
      });
      return apiError("Payment verification failed", 400);
    }

    let booking;
    try {
      booking = await confirmBusTicketAfterPayment({
        bookingId: parsed.data.bookingId,
        razorpayOrderId: parsed.data.razorpayOrderId,
        razorpayPaymentId: parsed.data.razorpayPaymentId,
      });
    } catch (confirmError) {
      const message =
        confirmError instanceof Error ? confirmError.message : "Confirmation failed";
      booking = await getBusBookingById(parsed.data.bookingId);
      return apiSuccess({
        verified: true,
        booking,
        manualReview: true,
        message:
          "Payment received. Ticket confirmation is pending. Our team will verify and update shortly.",
        error: message,
      });
    }

    if (booking.status === "confirmed") {
      try {
        await sendBookingConfirmationNotifications({
          booking: busBookingToLegacyBooking(booking),
        });
      } catch (emailError) {
        console.warn("Bus confirmation email failed:", emailError);
      }
    }

    return apiSuccess({
      verified: true,
      booking,
      manualReview: booking.status === "manual_review_required",
      message:
        booking.status === "manual_review_required"
          ? "Payment received. Ticket confirmation is pending. Our team will verify and update shortly."
          : "Bus ticket confirmed",
    });
  } catch (error) {
    return busApiError(error, "Payment verification failed");
  }
}
