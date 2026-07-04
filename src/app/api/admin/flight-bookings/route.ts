import { requireBookingsStaffAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { canViewFlightBookingsAdmin } from "@/lib/flights/admin-permissions";
import {
  loadAdminFlightBookings,
  sanitizeFlightBookingForAdmin,
} from "@/lib/flights/admin-service";

export async function GET(request: Request) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;
    if (!canViewFlightBookingsAdmin(auth.user.role)) {
      return apiError("Forbidden", 403);
    }

    const url = new URL(request.url);
    const result = await loadAdminFlightBookings({
      q: url.searchParams.get("q") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      paymentStatus: url.searchParams.get("paymentStatus") ?? undefined,
      dateFrom: url.searchParams.get("dateFrom") ?? undefined,
      dateTo: url.searchParams.get("dateTo") ?? undefined,
      airline: url.searchParams.get("airline") ?? undefined,
      route: url.searchParams.get("route") ?? undefined,
      page: Number(url.searchParams.get("page") ?? "1"),
      pageSize: Number(url.searchParams.get("pageSize") ?? "20"),
    });

    return apiSuccess({
      ...result,
      bookings: result.bookings.map((b) =>
        sanitizeFlightBookingForAdmin(b, auth.user.role)
      ),
      permissions: {
        canManage: auth.user.role === "super_admin",
        canViewFull: auth.user.role === "super_admin" || auth.user.role === "manager",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load flight bookings";
    return apiError(message, 500);
  }
}
