import { z } from "zod";
import { requireBookingsStaffAuth } from "@/lib/admin/api-auth";
import { adminBookingsHref } from "@/lib/admin/booking-admin-links";
import { createAdminNotification } from "@/lib/admin/notifications";
import { provisionCustomerBookingLogin } from "@/lib/auth/booking-customer-access";
import { resolveBookingLoginCredentials } from "@/lib/auth/booking-login-credentials";
import { sendBookingConfirmationNotifications } from "@/lib/bookings/booking-notifications";
import { getBookingById, updateBooking } from "@/lib/data-service";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import type { Booking, BookingStatus, PaymentStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
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
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
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
        href: adminBookingsHref(updated),
        bookingId: updated.id,
      });

      if (parsed.data.sendConfirmation) {
        const balanceDue = getBalanceDue(updated.amount, updated.paidAmount ?? 0);
        const loginCredentials = resolveBookingLoginCredentials(
          updated,
          loginProvision
        );
        await sendBookingConfirmationNotifications({
          booking: updated,
          isFullyPaid: balanceDue <= 0,
          channels: ["email", "whatsapp", "sms"],
          loginEmail: loginCredentials.loginEmail,
          loginPassword: loginCredentials.loginPassword,
        });
      }
    } else if (updated.status === "cancelled") {
      await createAdminNotification({
        type: "booking_pending",
        title: `Booking cancelled — ${updated.bookingNumber}`,
        message: `${updated.customerName} · ${updated.serviceName.en}`,
        href: adminBookingsHref(updated),
        bookingId: updated.id,
      });
    }

    return apiSuccess(updated);
  } catch (error) {
    console.error("Admin update booking error:", error);
    return apiError("Failed to update booking", 500);
  }
}
