import { requireBookingsStaffAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import {
  canManageHotelBookingsAdmin,
  canUpdateHotelRefundStatus,
  canViewHotelBookingsAdmin,
} from "@/lib/hotels/admin-permissions";
import {
  adminUpdateHotelBooking,
  runHotelAdminAction,
  sanitizeHotelBookingForAdmin,
} from "@/lib/hotels/admin-service";
import { getHotelBookingById } from "@/lib/hotels/firestore";
import type { HotelBookingRecord } from "@/lib/hotels/types";

const REFUND_ACTIONS = new Set([
  "mark_refund_processing",
  "mark_refunded",
  "add_refund_reference",
  "mark_refunded_manual",
]);

const MANAGE_ACTIONS = new Set([
  "refresh_status",
  "cancel_booking",
  "resend_email",
  "resend_voucher_email",
  "retry_book",
  "mark_voucher_sent",
  "mark_confirmed",
  "mark_cancelled",
  ...REFUND_ACTIONS,
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;
    if (!canViewHotelBookingsAdmin(auth.user.role)) {
      return apiError("Forbidden", 403);
    }

    const { id } = await params;
    const booking = await getHotelBookingById(id);
    if (!booking) return apiError("Booking not found", 404);

    return apiSuccess({
      booking: sanitizeHotelBookingForAdmin(booking, auth.user.role),
      permissions: {
        canManage: canManageHotelBookingsAdmin(auth.user.role),
        canUpdateRefund: canUpdateHotelRefundStatus(auth.user.role),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load booking";
    return apiError(message, 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const { data, error } = await parseJsonBody(request);
    if (error) return error;

    const body = (data ?? {}) as {
      action?: string;
      status?: HotelBookingRecord["status"];
      paymentStatus?: HotelBookingRecord["paymentStatus"];
      adminNotes?: string;
      remarks?: string;
      refundReference?: string;
      refundNote?: string;
      refundAmount?: number;
      refundMode?: string;
    };

    const action = body.action;

    if (action && MANAGE_ACTIONS.has(action)) {
      if (REFUND_ACTIONS.has(action)) {
        if (!canUpdateHotelRefundStatus(auth.user.role)) {
          return apiError("Only Super Admin or Manager can update refund status", 403);
        }
      } else if (!canManageHotelBookingsAdmin(auth.user.role)) {
        return apiError("Only Super Admin can perform this action", 403);
      }

      const updated = await runHotelAdminAction(id, {
        action,
        by: auth.user.email,
        remarks: body.remarks ?? body.adminNotes,
        refundReference: body.refundReference,
        refundNote: body.refundNote ?? body.adminNotes,
        refundAmount: body.refundAmount,
        refundMode: body.refundMode,
      });

      if (!updated) return apiError("Booking not found or unknown action", 404);

      return apiSuccess({
        booking: sanitizeHotelBookingForAdmin(updated, auth.user.role),
      });
    }

    if (!canManageHotelBookingsAdmin(auth.user.role)) {
      return apiError("Only Super Admin can update hotel bookings", 403);
    }

    const updated = await adminUpdateHotelBooking(id, {
      action: body.action,
      status: body.status,
      paymentStatus: body.paymentStatus,
      adminNotes: body.adminNotes,
      by: auth.user.email,
    });

    if (!updated) return apiError("Booking not found", 404);

    return apiSuccess({
      booking: sanitizeHotelBookingForAdmin(updated, auth.user.role),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return apiError(message, 500);
  }
}
