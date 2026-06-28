import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import { getAiCenterStats, hydrateAiCenterStore, listAiLogs } from "@/lib/ai-center/repository";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    await hydrateAiCenterStore();
    const limit = Number(searchParams.get("limit") ?? 300);

    return apiSuccess({
      logs: listAiLogs(limit),
      stats: await getAiCenterStats(),
    });
  } catch (err) {
    return apiError("Failed to load logs", 500);
  }
}
