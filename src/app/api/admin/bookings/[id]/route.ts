import { z } from "zod";
import { actorRoleSchema, requireBookingsStaffRole } from "@/lib/admin/api-auth";
import { createAdminNotification } from "@/lib/admin/notifications";
import { provisionCustomerBookingLogin } from "@/lib/auth/booking-customer-access";
import { sendBookingConfirmationNotifications } from "@/lib/bookings/booking-notifications";
import { getBookingById, updateBooking } from "@/lib/data-service";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import type { Booking, BookingStatus, PaymentStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  actorRole: actorRoleSchema,
  status: z
    .enum(["pending", "confirmed", "upcoming", "completed", "cancelled", "refunded"])
    .optional(),
  paymentStatus: z
    .enum(["pending", "partial", "paid", "failed", "refunded"])
    .optional(),
  sendConfirmation: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    if (!requireBookingsStaffRole(parsed.data.actorRole)) {
      return apiError("Forbidden", 403);
    }

    const existing = await getBookingById(id);
    if (!existing) {
      return apiError("Booking not found", 404);
    }

    const updates: Partial<Booking> = {};
    if (parsed.data.status) updates.status = parsed.data.status as BookingStatus;
    if (parsed.data.paymentStatus) {
      updates.paymentStatus = parsed.data.paymentStatus as PaymentStatus;
    }

    if (Object.keys(updates).length === 0) {
      return apiError("No updates provided", 400);
    }

    const updated = await updateBooking(id, updates);
    if (!updated) {
      return apiError("Failed to update booking", 500);
    }

    if (updated.status === "confirmed") {
      const loginProvision = await provisionCustomerBookingLogin(updated);
      await createAdminNotification({
        type: "booking_confirmed",
        title: `Booking confirmed — ${updated.bookingNumber}`,
        message: `${updated.customerName} · ${updated.serviceName.en}`,
        href: "/admin/bookings",
        bookingId: updated.id,
      });

      if (parsed.data.sendConfirmation) {
        const balanceDue = getBalanceDue(updated.amount, updated.paidAmount ?? 0);
        await sendBookingConfirmationNotifications({
          booking: updated,
          isFullyPaid: balanceDue <= 0,
          channels: ["email", "whatsapp", "sms"],
          loginEmail: loginProvision?.email,
          loginPassword: loginProvision?.loginPassword,
        });
      }
    } else if (updated.status === "cancelled") {
      await createAdminNotification({
        type: "booking_pending",
        title: `Booking cancelled — ${updated.bookingNumber}`,
        message: `${updated.customerName} · ${updated.serviceName.en}`,
        href: "/admin/bookings",
        bookingId: updated.id,
      });
    }

    return apiSuccess(updated);
  } catch (error) {
    console.error("Admin update booking error:", error);
    return apiError("Failed to update booking", 500);
  }
}
