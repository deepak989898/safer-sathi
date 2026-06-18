import { apiError, apiSuccess } from "@/lib/api-response";
import {
  getAITravelManagerStats,
  hydrateAITravelManagerStore,
} from "@/lib/ai-travel-manager/repository";
import {
  actorRoleSchema,
  requireAITravelManagerAccess,
} from "@/lib/ai-travel-manager/api-auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleParsed = actorRoleSchema.safeParse(searchParams.get("actorRole"));
    if (!roleParsed.success) {
      return apiError("actorRole query param required", 400);
    }
    const denied = requireAITravelManagerAccess(roleParsed.data);
    if (denied) return denied;

    await hydrateAITravelManagerStore();
    return apiSuccess(getAITravelManagerStats());
  } catch (err) {
    console.error("AI TM dashboard error:", err);
    return apiError("Failed to load dashboard stats", 500);
  }
}
