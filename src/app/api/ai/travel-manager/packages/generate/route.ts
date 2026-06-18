import { z } from "zod";
import { generatePackageDraft } from "@/lib/ai-travel-manager/agents/package-generator";
import {
  actorRoleSchema,
  requireGenerate,
} from "@/lib/ai-travel-manager/api-auth";
import { hydrateAITravelManagerStore } from "@/lib/ai-travel-manager/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  actorRole: actorRoleSchema,
  destination: z.string().min(2),
  category: z
    .enum([
      "domestic",
      "international",
      "religious",
      "adventure",
      "family",
      "honeymoon",
    ])
    .optional(),
  durationDays: z.number().int().min(3).max(14).optional(),
  competitorId: z.string().optional(),
  customName: z.string().optional(),
  createdBy: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const denied = requireGenerate(parsed.data.actorRole);
    if (denied) return denied;

    await hydrateAITravelManagerStore();
    const draft = await generatePackageDraft(parsed.data);
    return apiSuccess(draft, 201);
  } catch (err) {
    console.error("Generate package draft error:", err);
    return apiError("Failed to generate package draft", 500);
  }
}
