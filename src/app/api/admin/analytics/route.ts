import { getAdminAnalytics } from "@/lib/analytics-service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    return apiSuccess(await getAdminAnalytics());
  } catch (err) {
    console.error("Analytics error:", err);
    return apiError("Failed to load analytics", 500);
  }
}
