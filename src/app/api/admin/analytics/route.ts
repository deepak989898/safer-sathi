import { requireManagerAnalyticsAuth } from "@/lib/admin/api-auth";
import { getAdminAnalytics } from "@/lib/analytics-service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const auth = await requireManagerAnalyticsAuth(request);
    if ("error" in auth) return auth.error;

    return apiSuccess(await getAdminAnalytics(auth.user.role));
  } catch (err) {
    console.error("Analytics error:", err);
    return apiError("Failed to load analytics", 500);
  }
}
