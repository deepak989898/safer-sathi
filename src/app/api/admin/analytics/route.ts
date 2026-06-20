import { getAdminAnalytics } from "@/lib/analytics-service";
import { apiError, apiSuccess } from "@/lib/api-response";
import type { UserRole } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const actorRole = (searchParams.get("actorRole") as UserRole) ?? "super_admin";
    return apiSuccess(await getAdminAnalytics(actorRole));
  } catch (err) {
    console.error("Analytics error:", err);
    return apiError("Failed to load analytics", 500);
  }
}
