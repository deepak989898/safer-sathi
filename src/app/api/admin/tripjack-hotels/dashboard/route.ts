import { requireBookingsStaffAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { loadTripJackHotelOpsDashboard } from "@/lib/tripjack-hotels/ops-dashboard";

export async function GET(request: Request) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;
    if (!["super_admin", "manager"].includes(auth.user.role)) {
      return apiError("Forbidden", 403);
    }
    const dashboard = await loadTripJackHotelOpsDashboard();
    return apiSuccess({ dashboard });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load dashboard";
    return apiError(message, 500);
  }
}
