import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
import {
  getPhase3Stats,
  getReviewAnalysis,
  hydratePhase3Store,
  listBlockedUsers,
  listFraudLogs,
  listLeadScores,
  listPriceRules,
  listPricingHistory,
  listRatings,
} from "@/lib/ai-center/phase3-repository";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleCheck = parseSuperAdminRole(searchParams.get("actorRole"));
    if (roleCheck.error) return roleCheck.error;

    await hydratePhase3Store();

    return apiSuccess({
      stats: getPhase3Stats(),
      pricing: listPricingHistory(),
      rules: listPriceRules(),
      ratings: listRatings(),
      reviewAnalysis: getReviewAnalysis(),
      leads: listLeadScores(),
      fraud: listFraudLogs(),
      blocked: listBlockedUsers(),
    });
  } catch (err) {
    console.error("Phase 3 dashboard error:", err);
    return apiError("Failed to load Phase 3 data", 500);
  }
}
