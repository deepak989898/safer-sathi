import { z } from "zod";
import { actorRoleSchema, requireStaffRole } from "@/lib/admin/api-auth";
import { resolveBookingLoginCredentials } from "@/lib/auth/booking-login-credentials";
import { provisionCustomerBookingLogin } from "@/lib/auth/booking-customer-access";
import { sendBookingConfirmationNotifications } from "@/lib/bookings/booking-notifications";
import { getBookingById } from "@/lib/data-service";
import { getBalanceDue } from "@/lib/payments/booking-payment";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  actorRole: actorRoleSchema,
  channel: z.enum(["email", "whatsapp", "both"]),
});

export async function POST(
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

    if (!requireStaffRole(parsed.data.actorRole)) {
      return apiError("Forbidden", 403);
    }

    const booking = await getBookingById(id);
    if (!booking) {
      return apiError("Booking not found", 404);
    }

    const balanceDue = getBalanceDue(booking.amount, booking.paidAmount ?? 0);
    const loginProvision =
      booking.status === "confirmed"
        ? await provisionCustomerBookingLogin(booking)
        : null;
    const loginCredentials = resolveBookingLoginCredentials(booking, loginProvision);
    const channels =
      parsed.data.channel === "both"
        ? (["email", "whatsapp"] as const)
        : ([parsed.data.channel] as const);

    if (channels.includes("email") && !booking.customerEmail) {
      return apiError("Customer email is missing on this booking", 400);
    }
    if (channels.includes("whatsapp") && !booking.customerPhone) {
      return apiError("Customer phone is missing on this booking", 400);
    }

    const result = await sendBookingConfirmationNotifications({
      booking,
      isFullyPaid: balanceDue <= 0,
      channels: [...channels],
      loginEmail: loginCredentials.loginEmail,
      loginPassword: loginCredentials.loginPassword,
    });

    return apiSuccess({
      channel: parsed.data.channel,
      bookingNumber: booking.bookingNumber,
      email: result.email,
      whatsapp: result.whatsapp,
    });
  } catch (error) {
    console.error("Admin send invoice error:", error);
    return apiError("Failed to send invoice", 500);
  }
}
