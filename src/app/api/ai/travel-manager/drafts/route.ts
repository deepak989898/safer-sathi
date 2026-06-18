import {
  actorRoleSchema,
  requireAITravelManagerAccess,
} from "@/lib/ai-travel-manager/api-auth";
import {
  hydrateAITravelManagerStore,
  listCompetitorData,
  listHotelDrafts,
  listPackageDrafts,
  listVehicleDrafts,
} from "@/lib/ai-travel-manager/repository";
import { getVisibleDraftStatuses } from "@/lib/ai-travel-manager/permissions";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleParsed = actorRoleSchema.safeParse(searchParams.get("actorRole"));
    if (!roleParsed.success) return apiError("actorRole required", 400);

    const denied = requireAITravelManagerAccess(roleParsed.data);
    if (denied) return denied;

    await hydrateAITravelManagerStore();
    const visible = getVisibleDraftStatuses(roleParsed.data);

    return apiSuccess({
      competitors: listCompetitorData(),
      packages: listPackageDrafts().filter((p) =>
        visible.includes(p.approvalStatus)
      ),
      vehicles: listVehicleDrafts().filter((v) =>
        visible.includes(v.approvalStatus)
      ),
      hotels: listHotelDrafts().filter((h) =>
        visible.includes(h.approvalStatus)
      ),
    });
  } catch (err) {
    console.error("List AI drafts error:", err);
    return apiError("Failed to list drafts", 500);
  }
}
