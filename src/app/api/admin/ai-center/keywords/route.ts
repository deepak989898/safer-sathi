import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
import {
  getAiCenterStats,
  hydrateAiCenterStore,
  listKeywords,
  listSeoMeta,
  runKeywordGeneration,
} from "@/lib/ai-center/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleCheck = parseSuperAdminRole(searchParams.get("actorRole"));
    if (roleCheck.error) return roleCheck.error;

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

const generateSchema = z.object({
  actorRole: z.string(),
  actorId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const roleCheck = parseSuperAdminRole(parsed.data.actorRole);
    if (roleCheck.error) return roleCheck.error;

    await hydrateAiCenterStore();
    const result = await runKeywordGeneration(parsed.data.actorId);
    return apiSuccess({
      keywords: result.added,
      count: result.added.length,
      duplicatesSkipped: result.duplicatesSkipped,
      poolExhausted: result.poolExhausted,
      existingTotal: listKeywords().length,
    });
  } catch (err) {
    console.error("Generate keywords error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to generate keywords", 500);
  }
}
