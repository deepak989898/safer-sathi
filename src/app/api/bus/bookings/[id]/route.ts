import { z } from "zod";
import { retryBusTicketConfirmation } from "@/lib/bus/booking-service";
import { getBusBookingById, updateBusBooking } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { requireStaffAuth } from "@/lib/admin/api-auth";
import { optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

async function canAccessBooking(
  request: Request,
  bookingId: string
): Promise<{ booking: NonNullable<Awaited<ReturnType<typeof getBusBookingById>>> } | { error: Response }> {
  const booking = await getBusBookingById(bookingId);
  if (!booking) return { error: apiError("Booking not found", 404) };

  const staff = await requireStaffAuth(request);
  if (!("error" in staff)) return { booking };

  const auth = await optionalAuthenticateRequest(request);
  if (
    auth &&
    (booking.userId === auth.id ||
      booking.customerEmail.toLowerCase() === auth.email?.toLowerCase())
  ) {
    return { booking };
  }

  const email = new URL(request.url).searchParams.get("email");
  if (email && booking.customerEmail.toLowerCase() === email.toLowerCase()) {
    return { booking };
  }

  return { error: apiError("Unauthorized", 401) };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await canAccessBooking(request, id);
    if ("error" in access) return access.error;
    return apiSuccess({ booking: access.booking });
  } catch (error) {
    return busApiError(error, "Failed to load booking");
  }
}

const patchSchema = z.object({
  action: z.enum(["retry_confirm", "add_note", "mark_resolved"]).optional(),
  adminNotes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const staff = await requireStaffAuth(request);
    if ("error" in staff) return staff.error;

    const { id } = await params;
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const booking = await getBusBookingById(id);
    if (!booking) return apiError("Booking not found", 404);

    if (parsed.data.action === "retry_confirm") {
      const updated = await retryBusTicketConfirmation(id);
      return apiSuccess({ booking: updated });
    }

    if (parsed.data.action === "mark_resolved") {
      const updated = await updateBusBooking(id, {
        status: "confirmed",
        adminNotes: parsed.data.adminNotes ?? booking.adminNotes,
      });
      return apiSuccess({ booking: updated });
    }

    if (parsed.data.adminNotes !== undefined) {
      const updated = await updateBusBooking(id, {
        adminNotes: parsed.data.adminNotes,
      });
      return apiSuccess({ booking: updated });
    }

    return apiError("Unknown action", 400);
  } catch (error) {
    return busApiError(error, "Update failed");
  }
}
