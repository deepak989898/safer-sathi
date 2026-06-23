import { z } from "zod";
import { verifyPayment } from "@/lib/payments/razorpay";
import { getBookingById, updateBooking } from "@/lib/data-service";
import { sendBookingConfirmationNotifications } from "@/lib/bookings/booking-notifications";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  bookingId: z.string().optional(),
  amount: z.number().positive().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentPlan: z.enum(["full", "advance"]).optional(),
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
      if (parsed.data.bookingId) {
        await updateBooking(parsed.data.bookingId, {
          paymentStatus: "failed",
          paymentFailureReason: "Payment verification failed",
          lastPaymentAttemptAt: new Date().toISOString(),
        });
      }
      return apiError("Payment verification failed", 400);
    }

    if (parsed.data.bookingId) {
      const existing = await getBookingById(parsed.data.bookingId);
      if (!existing) {
        return apiError("Booking not found", 404);
      }

      const paidNow = parsed.data.amount ?? 0;
      const newPaidTotal = (existing.paidAmount ?? 0) + paidNow;
      const balanceDue = getBalanceDue(existing.amount, newPaidTotal);
      const isFullyPaid = balanceDue <= 0;

      const updated = await updateBooking(parsed.data.bookingId, {
        paymentStatus: isFullyPaid ? "paid" : "partial",
        paidAmount: newPaidTotal,
        status: "confirmed",
        paymentPlan: parsed.data.paymentPlan ?? existing.paymentPlan,
        paymentFailureReason: undefined,
        lastPaymentAttemptAt: new Date().toISOString(),
      });

      const bookingForNotify = updated ?? {
        ...existing,
        paymentStatus: isFullyPaid ? "paid" : "partial",
        paidAmount: newPaidTotal,
        status: "confirmed" as const,
      };

      await sendBookingConfirmationNotifications({
        booking: bookingForNotify,
        isFullyPaid,
        channels: ["email", "whatsapp", "sms"],
      });
    }

    return apiSuccess({
      verified: true,
      paymentId: parsed.data.razorpayPaymentId,
      orderId: parsed.data.razorpayOrderId,
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return apiError("Failed to verify payment", 500);
  }
}
