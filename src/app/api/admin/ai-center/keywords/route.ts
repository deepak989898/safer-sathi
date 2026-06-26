import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import {
  getAiCenterStats,
  hydrateAiCenterStore,
  listKeywords,
  listSeoMeta,
  runKeywordGeneration,
} from "@/lib/ai-center/repository";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    await hydrateAiCenterStore();
    const status = searchParams.get("status") as "pending" | "approved" | "rejected" | null;

    return apiSuccess({
      keywords: listKeywords(status ?? undefined),
      seoMeta: listSeoMeta(),
      stats: await getAiCenterStats(),
    });
  } catch (err) {
    console.error("List keywords error:", err);
    return apiError("Failed to list keywords", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    await hydrateAiCenterStore();
    const result = await runKeywordGeneration(auth.user.id);
    return apiSuccess({
      keywords: result.added,
      count: result.added.length,
      duplicatesSkipped: result.duplicatesSkipped,
      poolExhausted: result.poolExhausted,
      googleSuggestCount: result.googleSuggestCount,
      googleSerpCount: result.googleSerpCount,
      existingTotal: listKeywords().length,
    });
  } catch (err) {
    console.error("Generate keywords error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to generate keywords", 500);
  }
}
