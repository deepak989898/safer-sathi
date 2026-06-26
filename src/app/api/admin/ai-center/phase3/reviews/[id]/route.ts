import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import {
  approveRating,
  deleteRating,
  hideRating,
  hydratePhase3Store,
  replyToRating,
} from "@/lib/ai-center/phase3-repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const patchSchema = z.object({
  action: z.enum(["approve", "hide", "reply", "delete"]),
  adminReply: z.string().optional(),
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

    if (parsed.data.action === "approve") {
      return apiSuccess({ rating: await approveRating(id, actorId) });
    }
    if (parsed.data.action === "hide") {
      return apiSuccess({ rating: await hideRating(id) });
    }
    if (parsed.data.action === "reply") {
      return apiSuccess({ rating: await replyToRating(id, parsed.data.adminReply ?? "") });
    }
    await deleteRating(id);
    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiError(err instanceof Error ? err.message : "Failed", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    await hydratePhase3Store();
    await deleteRating(id);
    return apiSuccess({ deleted: true });
  } catch {
    return apiError("Delete failed", 500);
  }
}
