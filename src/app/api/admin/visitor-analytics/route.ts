import { requireManagerAnalyticsAuth } from "@/lib/admin/api-auth";
import { getVisitorAnalytics } from "@/lib/visitor-analytics/repository";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const auth = await requireManagerAnalyticsAuth(request);
    if ("error" in auth) return auth.error;

    const data = await getVisitorAnalytics();
    return apiSuccess(data);
  } catch (err) {
    console.error("Visitor analytics admin error:", err);
    return apiError("Failed to load visitor analytics", 500);
  }
}
