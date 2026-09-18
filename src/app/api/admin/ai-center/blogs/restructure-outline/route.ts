import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import { restructureBlogsToTravelOutline } from "@/lib/ai-center/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const schema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  onlyMissing: z.boolean().optional(),
  status: z
    .enum(["draft", "pending_approval", "approved", "published", "rejected"])
    .optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body ?? {});
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await restructureBlogsToTravelOutline(parsed.data);
    return apiSuccess(result);
  } catch (err) {
    console.error("Restructure blogs error:", err);
    return apiError(
      err instanceof Error ? err.message : "Failed to restructure blogs",
      500
    );
  }
}
