import { z } from "zod";
import { requireBookingsStaffAuth } from "@/lib/admin/api-auth";
import { lookupBookingForRecovery, recoverPaidBooking } from "@/lib/bookings/recover-paid-booking";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postSchema = z.object({
  bookingNumber: z.string().min(6),
  razorpayPaymentId: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  paidAmount: z.number().positive().optional(),
  paymentPlan: z.enum(["full", "advance"]).optional(),
  sendConfirmation: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const bookingNumber = searchParams.get("bookingNumber");
    if (!bookingNumber) {
      return apiError("bookingNumber is required", 400);
    }

    const lookup = await lookupBookingForRecovery({
      bookingNumber,
      razorpayPaymentId: searchParams.get("razorpayPaymentId") ?? undefined,
      razorpayOrderId: searchParams.get("razorpayOrderId") ?? undefined,
    });

    return apiSuccess({
      bookingNumber: lookup.bookingNumber,
      found: Boolean(lookup.booking),
      source: lookup.source,
      storedBookingId: lookup.storedBookingId,
      notificationTitle: lookup.notificationTitle,
      notificationMessage: lookup.notificationMessage,
      warnings: lookup.warnings,
      booking: lookup.booking,
      razorpayPayment: lookup.razorpayPayment,
      razorpayOrder: lookup.razorpayOrder,
      suggestedPaidAmount:
        lookup.razorpayPayment?.amount ??
        (lookup.razorpayOrder?.amountPaid ? lookup.razorpayOrder.amountPaid : undefined) ??
        lookup.booking?.depositAmount ??
        undefined,
    });
  } catch (error) {
    console.error("Recover booking preview error:", error);
    return apiError("Failed to preview booking recovery", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await recoverPaidBooking({
      ...parsed.data,
      recoveredBy: auth.user.email || auth.user.name || "admin",
    });

    if (!result.ok) {
      return apiError(result.error, 400, { lookup: result.lookup });
    }

    return apiSuccess({
      booking: result.booking,
      isFullyPaid: result.isFullyPaid,
      balanceDue: result.balanceDue,
      loginCredentials: result.loginCredentials,
      warnings: result.lookup.warnings,
    });
  } catch (error) {
    console.error("Recover booking error:", error);
    return apiError("Failed to recover paid booking", 500);
  }
}
