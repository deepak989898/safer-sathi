import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import { hydratePhase3Store, resolveFraudLog, unblockUser } from "@/lib/ai-center/phase3-repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const patchSchema = z.object({
  action: z.enum(["resolve", "unblock"]),
  blockedUserId: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    await hydratePhase3Store();
    const actorId = auth.user.id;

    if (parsed.data.action === "unblock" && parsed.data.blockedUserId) {
      return apiSuccess({ unblocked: await unblockUser(parsed.data.blockedUserId, actorId) });
    }

    return apiSuccess({ fraud: await resolveFraudLog(id, actorId) });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed", 500);
  }
}
