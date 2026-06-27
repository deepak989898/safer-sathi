import { z } from "zod";
import { updateBooking, getBookingById } from "@/lib/data-service";
import { refundReservedRewardPoints } from "@/lib/rewards/rewards-service";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  paymentStatus: z.enum(["pending", "failed", "partial", "paid"]),
  paymentFailureReason: z.string().optional(),
  lastPaymentAttemptAt: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const existing = await getBookingById(id);
    if (!existing) {
      return apiError("Booking not found", 404);
    }

    if (existing.paymentStatus === "paid") {
      return apiError("Booking is already fully paid", 400);
    }

    const notes = parsed.data.paymentFailureReason
      ? [
          existing.notes,
          `[Payment ${parsed.data.paymentStatus}] ${parsed.data.paymentFailureReason}`,
        ]
          .filter(Boolean)
          .join("\n")
      : existing.notes;

    const updated = await updateBooking(id, {
      paymentStatus: parsed.data.paymentStatus,
      status: existing.status === "confirmed" ? existing.status : "pending",
      paymentFailureReason: parsed.data.paymentFailureReason,
      lastPaymentAttemptAt: parsed.data.lastPaymentAttemptAt ?? new Date().toISOString(),
      notes,
    });

    if (
      parsed.data.paymentStatus === "failed" &&
      existing.rewardPointsRedeemed &&
      existing.rewardPointsRedeemed > 0 &&
      existing.userId &&
      existing.userId !== "guest"
    ) {
      await refundReservedRewardPoints({
        userId: existing.userId,
        points: existing.rewardPointsRedeemed,
        bookingId: existing.id,
        bookingNumber: existing.bookingNumber,
      });
    }

    return apiSuccess(updated);
  } catch (err) {
    console.error("Update booking payment status error:", err);
    return apiError("Failed to update booking payment status", 500);
  }
}
