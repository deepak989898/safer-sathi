import { getVisitorAnalytics } from "@/lib/visitor-analytics/repository";
import { apiError, apiSuccess } from "@/lib/api-response";
import type { UserRole } from "@/types";

const ALLOWED: UserRole[] = ["super_admin", "manager"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get("actorRole") as UserRole) ?? "customer";
    if (!ALLOWED.includes(role)) {
      return apiError("Only Super Admin and Manager can view visitor analytics", 403);
    }

    const data = await getVisitorAnalytics();
    return apiSuccess(data);
  } catch (err) {
    console.error("Visitor analytics admin error:", err);
    return apiError("Failed to load visitor analytics", 500);
  }
}
