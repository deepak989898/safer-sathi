import { z } from "zod";
import { generateVehicleDraft } from "@/lib/ai-travel-manager/agents/vehicle-generator";
import {
  actorRoleSchema,
  requireGenerate,
} from "@/lib/ai-travel-manager/api-auth";
import { hydrateAITravelManagerStore } from "@/lib/ai-travel-manager/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  actorRole: actorRoleSchema,
  name: z.string().optional(),
  category: z
    .enum(["car", "suv", "luxury", "tempo_traveller", "mini_bus", "bus"])
    .optional(),
  seats: z.number().int().min(2).max(50).optional(),
  location: z.string().optional(),
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
    const draft = await generateVehicleDraft(parsed.data);
    return apiSuccess(draft, 201);
  } catch (err) {
    console.error("Generate vehicle draft error:", err);
    return apiError("Failed to generate vehicle draft", 500);
  }
}
