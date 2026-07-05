import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { buildTripJackHotelProductionChecklist } from "@/lib/tripjack-hotels/production-checklist";

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;
    const items = await buildTripJackHotelProductionChecklist();
    const passed = items.filter((i) => i.passed).length;
    return apiSuccess({
      items,
      passed,
      total: items.length,
      ready: passed === items.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load checklist";
    return apiError(message, 500);
  }
}
