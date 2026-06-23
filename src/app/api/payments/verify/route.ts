import { z } from "zod";
import { verifyPayment } from "@/lib/payments/razorpay";
import { getBookingById, updateBooking } from "@/lib/data-service";
import { sendBookingConfirmationNotifications } from "@/lib/bookings/booking-notifications";
import { provisionCustomerBookingLogin } from "@/lib/auth/booking-customer-access";
import { createAdminNotification } from "@/lib/admin/notifications";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
        await createAdminNotification({
          type: "payment_failed",
          title: "Payment verification failed",
          message: `Booking payment could not be verified.`,
          href: "/admin/bookings",
          bookingId: parsed.data.bookingId,
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
        paymentStatus: isFullyPaid ? ("paid" as const) : ("partial" as const),
        paidAmount: newPaidTotal,
        status: "confirmed" as const,
      };

      const loginProvision = await provisionCustomerBookingLogin(bookingForNotify);

      await createAdminNotification({
        type: "booking_confirmed",
        title: `Booking confirmed — ${bookingForNotify.bookingNumber}`,
        message: `${bookingForNotify.customerName} · ${bookingForNotify.serviceName.en} · ${isFullyPaid ? "Paid in full" : "Partial payment"}`,
        href: "/admin/bookings",
        bookingId: bookingForNotify.id,
      });

      await sendBookingConfirmationNotifications({
        booking: bookingForNotify,
        isFullyPaid,
        channels: ["email", "whatsapp", "sms"],
        loginEmail: loginProvision?.email,
        loginPassword: loginProvision?.loginPassword,
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
