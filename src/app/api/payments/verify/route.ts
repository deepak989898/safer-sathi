import { z } from "zod";
import { confirmPaidBooking } from "@/lib/bookings/confirm-paid-booking";
import {
  getBookingById,
  getBookingByNumber,
  updateBooking,
  upsertBooking,
} from "@/lib/data-service";
import { adminBookingsHref } from "@/lib/admin/booking-admin-links";
import { createAdminNotification } from "@/lib/admin/notifications";
import { verifyPayment } from "@/lib/payments/razorpay";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import type { Booking } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bookingSnapshotSchema = z.object({
  id: z.string().min(1),
  bookingNumber: z.string().min(1),
  userId: z.string().optional(),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(1),
  serviceType: z.enum([
    "package",
    "vehicle",
    "hotel",
    "bus",
    "car_rental",
    "tempo_traveller",
    "airport_pickup",
    "holiday",
  ]),
  serviceId: z.string().min(1),
  serviceName: z.object({ en: z.string(), hi: z.string() }),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  guests: z.number().int().positive(),
  amount: z.number().positive(),
  bookingMode: z.enum(["day", "km"]).optional(),
  distanceKm: z.number().positive().optional(),
  departure: z.string().optional(),
  destination: z.string().optional(),
  depositAmount: z.number().optional(),
  paidAmount: z.number().optional(),
  paymentPlan: z.enum(["full", "advance"]).optional(),
  status: z.enum(["pending", "confirmed", "upcoming", "completed", "cancelled", "refunded"]).optional(),
  paymentStatus: z.enum(["pending", "partial", "paid", "failed", "refunded"]).optional(),
  aiProcessed: z.boolean().optional(),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const schema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
  bookingId: z.string().optional(),
  bookingNumber: z.string().optional(),
  bookingSnapshot: bookingSnapshotSchema.optional(),
  amount: z.number().positive().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentPlan: z.enum(["full", "advance"]).optional(),
});

async function resolveBookingForPayment(input: {
  bookingId?: string;
  bookingNumber?: string;
  bookingSnapshot?: z.infer<typeof bookingSnapshotSchema>;
}): Promise<Booking | null> {
  if (input.bookingId) {
    const byId = await getBookingById(input.bookingId);
    if (byId) return byId;
  }

  if (input.bookingNumber) {
    const byNumber = await getBookingByNumber(input.bookingNumber);
    if (byNumber) return byNumber;
  }

  if (input.bookingSnapshot) {
    const now = new Date().toISOString();
    const recovered = await upsertBooking({
      ...input.bookingSnapshot,
      userId: input.bookingSnapshot.userId ?? "guest",
      paidAmount: input.bookingSnapshot.paidAmount ?? 0,
      paymentPlan: input.bookingSnapshot.paymentPlan ?? "advance",
      status: input.bookingSnapshot.status ?? "pending",
      paymentStatus: input.bookingSnapshot.paymentStatus ?? "pending",
      aiProcessed: input.bookingSnapshot.aiProcessed ?? false,
      createdAt: input.bookingSnapshot.createdAt ?? now,
      updatedAt: now,
    });
    if (recovered) return recovered;
  }

  return null;
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
          href: adminBookingsHref({
            id: parsed.data.bookingId,
            bookingNumber: parsed.data.bookingNumber ?? "",
          }),
          bookingId: parsed.data.bookingId,
        });
      }
      return apiError("Payment verification failed", 400);
    }

    const existing = await resolveBookingForPayment({
      bookingId: parsed.data.bookingId,
      bookingNumber: parsed.data.bookingNumber,
      bookingSnapshot: parsed.data.bookingSnapshot,
    });

    if (!existing) {
      return apiError("Booking not found", 404);
    }

    const paidNow = parsed.data.amount ?? 0;

    const result = await confirmPaidBooking({
      booking: existing,
      paidAmount: (existing.paidAmount ?? 0) + paidNow,
      paymentPlan: parsed.data.paymentPlan ?? existing.paymentPlan,
    });

    return apiSuccess({
      verified: true,
      paymentId: parsed.data.razorpayPaymentId,
      orderId: parsed.data.razorpayOrderId,
      bookingId: result.booking.id,
      bookingNumber: result.booking.bookingNumber,
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return apiError("Failed to verify payment", 500);
  }
}
