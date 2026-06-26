import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import { getSeoDashboardData } from "@/lib/seo/dashboard-service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const data = await getSeoDashboardData();
    return apiSuccess(data);
  } catch (err) {
    console.error("SEO dashboard error:", err);
    return apiError("Failed to load SEO dashboard", 500);
  }
}
