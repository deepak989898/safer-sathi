import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import {
  getReviewAnalysis,
  hydratePhase3Store,
  listRatings,
} from "@/lib/ai-center/phase3-repository";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
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
