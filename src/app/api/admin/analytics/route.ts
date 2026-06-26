import { requireManagerAnalyticsRole } from "@/lib/admin/api-auth";
import { authenticateAdminRequest } from "@/lib/admin/extract-admin-token";
import { getAdminAnalytics } from "@/lib/analytics-service";
import { apiError, apiSuccess } from "@/lib/api-response";
import { sanitizeForJson } from "@/lib/sanitize-for-json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadAnalyticsResponse(request: Request) {
  const auth = await authenticateAdminRequest(request);
  if ("error" in auth) return auth.error;

  if (!requireManagerAnalyticsRole(auth.user.role)) {
    return apiError("Only Super Admin and Manager can access analytics", 403);
  }

  const data = await getAdminAnalytics(auth.user.role);
  return apiSuccess(sanitizeForJson(data));
}

export async function GET(request: Request) {
  try {
    return await loadAnalyticsResponse(request);
  } catch (err) {
    console.error("Analytics GET error:", err);
    const message = err instanceof Error ? err.message : "Failed to load analytics";
    return apiError(message, 500);
  }
}

/** Token in JSON body — reliable when apex→www redirects strip Authorization headers. */
export async function POST(request: Request) {
  try {
    return await loadAnalyticsResponse(request);
  } catch (err) {
    console.error("Analytics POST error:", err);
    const message = err instanceof Error ? err.message : "Failed to load analytics";
    return apiError(message, 500);
  }
}
