import { z } from "zod";
import { requireBookingsStaffAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import {
  canManageFlightBookingsAdmin,
  canViewFlightBookingsAdmin,
} from "@/lib/flights/admin-permissions";
import {
  runFlightAdminAction,
  sanitizeFlightBookingForAdmin,
} from "@/lib/flights/admin-service";
import { getFlightBookingById } from "@/lib/flights/firestore";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;
    if (!canViewFlightBookingsAdmin(auth.user.role)) {
      return apiError("Forbidden", 403);
    }

    const { id } = await params;
    const booking = await getFlightBookingById(id);
    if (!booking) return apiError("Booking not found", 404);

    return apiSuccess({
      booking: sanitizeFlightBookingForAdmin(booking, auth.user.role),
      permissions: {
        canManage: canManageFlightBookingsAdmin(auth.user.role),
        canViewFull:
          auth.user.role === "super_admin" || auth.user.role === "manager",
        canViewRaw: canManageFlightBookingsAdmin(auth.user.role),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load booking";
    return apiError(message, 500);
  }
}

const patchSchema = z.object({
  action: z.enum([
    "refresh_detail",
    "retry_booking_detail",
    "retry_book",
    "retry_poll",
    "retry_release_pnr",
    "add_note",
    "mark_resolved",
  ]),
  note: z.string().optional(),
  adminNotes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;
    if (!canViewFlightBookingsAdmin(auth.user.role)) {
      return apiError("Forbidden", 403);
    }

    const { id } = await params;
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const note = parsed.data.note ?? parsed.data.adminNotes;
    const booking = await runFlightAdminAction(
      id,
      parsed.data.action,
      auth.user,
      note
    );

    return apiSuccess({
      booking: sanitizeFlightBookingForAdmin(booking, auth.user.role),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed";
    return apiError(message, 500);
  }
}
