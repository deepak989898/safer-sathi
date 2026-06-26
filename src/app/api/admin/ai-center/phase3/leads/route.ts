import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import { hydratePhase3Store, listLeadScores } from "@/lib/ai-center/phase3-repository";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    await hydratePhase3Store();
    const status = searchParams.get("status") as "hot" | "warm" | "cold" | null;

    return apiSuccess({ leads: listLeadScores(status ?? undefined) });
  } catch {
    return apiError("Failed to load leads", 500);
  }
}
