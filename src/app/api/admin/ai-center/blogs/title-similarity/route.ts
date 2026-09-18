import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import { checkManualTitleSimilarity } from "@/lib/ai-center/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  titles: z.array(z.string().min(8).max(200)).min(1).max(40),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Provide 1–40 titles (each at least 8 characters)", 400, parsed.error.flatten());
    }

    const results = await checkManualTitleSimilarity(parsed.data.titles);
    const conflicts = results.filter((r) => r.status === "conflict");
    const noConflict = results.filter((r) => r.status === "no_conflict");

    return apiSuccess({
      results,
      conflicts,
      noConflict,
      summary: {
        total: results.length,
        conflictCount: conflicts.length,
        noConflictCount: noConflict.length,
      },
    });
  } catch (err) {
    console.error("Title similarity check error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to check title similarity",
      500
    );
  }
}
