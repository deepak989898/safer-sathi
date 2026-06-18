import { z } from "zod";
import { generateHotelDraft } from "@/lib/ai-travel-manager/agents/hotel-generator";
import { generatePackageDraft } from "@/lib/ai-travel-manager/agents/package-generator";
import { generateVehicleDraft } from "@/lib/ai-travel-manager/agents/vehicle-generator";
import {
  actorRoleSchema,
  requireApprove,
  requireRecommend,
  requireReject,
  requireReview,
} from "@/lib/ai-travel-manager/api-auth";
import { nextStatusAfterManagerReview } from "@/lib/ai-travel-manager/permissions";
import type { DraftEntityType } from "@/lib/ai-travel-manager/types";
import {
  ensurePackageDraft,
  getHotelDraftById,
  getPackageDraftById,
  getVehicleDraftById,
  hydrateAITravelManagerStore,
  publishHotelDraft,
  publishPackageDraft,
  updateHotelDraft,
  updatePackageDraft,
  updateVehicleDraft,
  publishVehicleDraft,
} from "@/lib/ai-travel-manager/repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const actionSchema = z.object({
  actorRole: actorRoleSchema,
  actorId: z.string().min(1),
  reason: z.string().optional(),
  managerNotes: z.string().optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
  fallbackDraft: z.record(z.string(), z.unknown()).optional(),
});

function getDraft(type: DraftEntityType, id: string) {
  if (type === "package") return getPackageDraftById(id);
  if (type === "vehicle") return getVehicleDraftById(id);
  return getHotelDraftById(id);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    if (!["package", "vehicle", "hotel"].includes(type)) {
      return apiError("Invalid draft type", 400);
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const denied = requireReview(parsed.data.actorRole);
    if (denied) return denied;

    await hydrateAITravelManagerStore();
    let draft = getDraft(type as DraftEntityType, id);

    if (!draft && type === "package" && parsed.data.fallbackDraft) {
      draft = await ensurePackageDraft(parsed.data.fallbackDraft as never);
    }

    if (!draft) return apiError("Draft not found", 404);

    if (type === "package") {
      const updated = await updatePackageDraft(id, parsed.data.updates as never);
      return apiSuccess(updated);
    }
    if (type === "vehicle") {
      const updated = await updateVehicleDraft(id, parsed.data.updates as never);
      return apiSuccess(updated);
    }
    const updated = await updateHotelDraft(id, parsed.data.updates as never);
    return apiSuccess(updated);
  } catch (err) {
    console.error("Update draft error:", err);
    return apiError("Failed to update draft", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (!["package", "vehicle", "hotel"].includes(type)) {
      return apiError("Invalid draft type", 400);
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    await hydrateAITravelManagerStore();
    const draftType = type as DraftEntityType;
    let draft = getDraft(draftType, id);

    if (!draft && draftType === "package" && parsed.data.fallbackDraft) {
      draft = await ensurePackageDraft(parsed.data.fallbackDraft as never);
    }

    if (!draft) return apiError("Draft not found", 404);

    if (action === "recommend") {
      const denied = requireRecommend(parsed.data.actorRole);
      if (denied) return denied;

      const next = nextStatusAfterManagerReview(draft.approvalStatus);
      const updates = {
        approvalStatus: next,
        managerReviewedBy: parsed.data.actorId,
        managerReviewedAt: new Date().toISOString(),
        managerNotes: parsed.data.managerNotes,
      };

      if (draftType === "package") {
        return apiSuccess(await updatePackageDraft(id, updates));
      }
      if (draftType === "vehicle") {
        return apiSuccess(await updateVehicleDraft(id, updates));
      }
      return apiSuccess(await updateHotelDraft(id, updates));
    }

    if (action === "approve") {
      const denied = requireApprove(parsed.data.actorRole);
      if (denied) return denied;

      if (
        !["draft", "manager_review", "pending_approval"].includes(
          draft.approvalStatus
        )
      ) {
        return apiError("Draft is not eligible for approval", 400);
      }

      if (draftType === "package") {
        return apiSuccess(
          await publishPackageDraft(id, parsed.data.actorId)
        );
      }
      if (draftType === "vehicle") {
        return apiSuccess(
          await publishVehicleDraft(id, parsed.data.actorId)
        );
      }
      return apiSuccess(await publishHotelDraft(id, parsed.data.actorId));
    }

    if (action === "reject") {
      const denied = requireReject(parsed.data.actorRole);
      if (denied) return denied;

      const updates = {
        approvalStatus: "rejected" as const,
        rejectionReason: parsed.data.reason ?? "Rejected by super admin",
      };

      if (draftType === "package") {
        return apiSuccess(await updatePackageDraft(id, updates));
      }
      if (draftType === "vehicle") {
        return apiSuccess(await updateVehicleDraft(id, updates));
      }
      return apiSuccess(await updateHotelDraft(id, updates));
    }

    if (action === "regenerate") {
      const denied = requireReview(parsed.data.actorRole);
      if (denied) return denied;

      if (draftType === "package") {
        const pkg = draft as Awaited<ReturnType<typeof getPackageDraftById>>;
        if (!pkg) return apiError("Draft not found", 404);
        const regenerated = await generatePackageDraft({
          destination: pkg.cities[0] ?? "Goa",
          category: pkg.category,
          durationDays: pkg.duration,
          competitorId: pkg.competitorId,
          customName: pkg.title.en,
          createdBy: parsed.data.actorId,
        });
        return apiSuccess(regenerated);
      }

      if (draftType === "vehicle") {
        const veh = draft as Awaited<ReturnType<typeof getVehicleDraftById>>;
        if (!veh) return apiError("Draft not found", 404);
        const regenerated = await generateVehicleDraft({
          name: veh.name.en,
          category: veh.category,
          seats: veh.seats,
          location: veh.location,
          createdBy: parsed.data.actorId,
        });
        return apiSuccess(regenerated);
      }

      const hotel = draft as Awaited<ReturnType<typeof getHotelDraftById>>;
      if (!hotel) return apiError("Draft not found", 404);
      const regenerated = await generateHotelDraft({
        name: hotel.name.en,
        city: hotel.city,
        category: hotel.category,
        starRating: hotel.starRating,
        createdBy: parsed.data.actorId,
      });
      return apiSuccess(regenerated);
    }

    return apiError(
      "Unknown action. Use ?action=recommend|approve|reject|regenerate",
      400
    );
  } catch (err) {
    console.error("Draft action error:", err);
    return apiError("Failed to process draft action", 500);
  }
}
