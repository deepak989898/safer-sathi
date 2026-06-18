import { z } from "zod";
import { generateHotelDraft } from "@/lib/ai-travel-manager/agents/hotel-generator";
import {
  actorRoleSchema,
  requireGenerate,
} from "@/lib/ai-travel-manager/api-auth";
import { hydrateAITravelManagerStore } from "@/lib/ai-travel-manager/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  actorRole: actorRoleSchema,
  name: z.string().optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  starRating: z.number().int().min(1).max(5).optional(),
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
    const draft = await generateHotelDraft(parsed.data);
    return apiSuccess(draft, 201);
  } catch (err) {
    console.error("Generate hotel draft error:", err);
    return apiError("Failed to generate hotel draft", 500);
  }
}
