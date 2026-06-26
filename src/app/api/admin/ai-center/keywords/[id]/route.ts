import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import {
  approveKeyword,
  deleteKeyword,
  hydrateAiCenterStore,
  rejectKeyword,
} from "@/lib/ai-center/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
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

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    await hydrateAiCenterStore();

    if (parsed.data.action === "approve") {
      const result = await approveKeyword(id, auth.user.id);
      return apiSuccess(result);
    }

    const keyword = await rejectKeyword(id, parsed.data.reason);
    return apiSuccess({ keyword });
  } catch (err) {
    console.error("Keyword action error:", err);
    return apiError(err instanceof Error ? err.message : "Action failed", 500);
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

    await hydrateAiCenterStore();
    await deleteKeyword(id);
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("Delete keyword error:", err);
    return apiError("Failed to delete keyword", 500);
  }
}
