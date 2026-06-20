import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
import {
  getReviewAnalysis,
  hydratePhase3Store,
  listRatings,
} from "@/lib/ai-center/phase3-repository";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleCheck = parseSuperAdminRole(searchParams.get("actorRole"));
    if (roleCheck.error) return roleCheck.error;

    await hydratePhase3Store();
    const status = searchParams.get("status") as "pending" | "approved" | "hidden" | null;

    return apiSuccess({
      ratings: listRatings(status ?? undefined),
      analysis: getReviewAnalysis(),
    });
  } catch {
    return apiError("Failed to load reviews", 500);
  }
}
