import { z } from "zod";
import { verifyPayment } from "@/lib/payments/razorpay";
import { updateBooking } from "@/lib/data-service";
import { sendEmail } from "@/lib/notifications/email";
import { sendSMS } from "@/lib/notifications/sms";
import { sendWhatsApp } from "@/lib/notifications/whatsapp";
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
      return apiError("Payment verification failed", 400);
    }

    if (parsed.data.bookingId) {
      await updateBooking(parsed.data.bookingId, {
        paymentStatus: "paid",
        paidAmount: parsed.data.amount,
        status: "confirmed",
      });

      const { customerEmail, customerPhone, customerName, bookingId, amount } = parsed.data;
      if (customerEmail || customerPhone) {
        const msg = `Safar Sathi: Booking confirmed! Amount paid: ₹${(amount ?? 0).toLocaleString("en-IN")}. Thank you ${customerName ?? ""}!`;
        const notifyTasks = [];
        if (customerEmail) {
          notifyTasks.push(
            sendEmail({
              to: customerEmail,
              subject: "Safar Sathi — Booking Confirmed",
              text: msg,
              html: `<p>${msg}</p><p>Your invoice will be shared shortly.</p>`,
            })
          );
        }
        if (customerPhone) {
          notifyTasks.push(sendSMS({ to: customerPhone, message: msg }));
          notifyTasks.push(sendWhatsApp({ to: customerPhone, message: msg }));
        }
        await Promise.allSettled(notifyTasks);
      }
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
