import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
import {
  getAiCenterSettings,
  hydrateAiCenterStore,
  updateAiCenterSettings,
} from "@/lib/ai-center/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleCheck = parseSuperAdminRole(searchParams.get("actorRole"));
    if (roleCheck.error) return roleCheck.error;

    await hydrateAiCenterStore();
    return apiSuccess(getAiCenterSettings());
  } catch (err) {
    return apiError("Failed to load settings", 500);
  }
}

const settingsSchema = z.object({
  actorRole: z.string(),
  actorId: z.string().optional(),
  blogWordLimit: z.union([z.literal(1000), z.literal(1500), z.literal(2000), z.literal(3000)]).optional(),
  keywordsPerDay: z.number().min(1).max(50).optional(),
  autoDraftEnabled: z.boolean().optional(),
  autoPublishEnabled: z.boolean().optional(),
  approvalRequired: z.boolean().optional(),
});

export async function PUT(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) return apiError("Validation failed", 400, parsed.error.flatten());

    const roleCheck = parseSuperAdminRole(parsed.data.actorRole);
    if (roleCheck.error) return roleCheck.error;

    const { actorRole: _r, actorId, ...updates } = parsed.data;
    if (updates.autoPublishEnabled && updates.approvalRequired === false) {
      return apiError("Approval is always required before publishing", 400);
    }
    if (updates.approvalRequired === false) {
      updates.approvalRequired = true;
    }

    await hydrateAiCenterStore();
    const settings = await updateAiCenterSettings(updates, actorId);
    return apiSuccess(settings);
  } catch (err) {
    return apiError("Failed to update settings", 500);
  }
}
