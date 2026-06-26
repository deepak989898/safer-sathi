import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import {
  approveTourPackage,
  deleteTourPackage,
  generateTourPackage,
  getTourPackageById,
  hydrateTourPackagesStore,
  publishTourPackage,
  rejectTourPackage,
  updateTourPackage,
} from "@/lib/ai-center/package-repository";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

const patchSchema = z.object({
  action: z.enum(["approve", "reject", "publish", "regenerate", "update"]).optional(),
  reason: z.string().optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
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

    await hydrateTourPackagesStore();
    const action = parsed.data.action ?? "update";
    const actorId = auth.user.id;

    if (action === "approve") {
      const pkg = await approveTourPackage(id, actorId);
      return apiSuccess({ package: pkg });
    }
    if (action === "reject") {
      const pkg = await rejectTourPackage(id, parsed.data.reason);
      return apiSuccess({ package: pkg });
    }
    if (action === "publish") {
      const pkg = await publishTourPackage(id, actorId);
      return apiSuccess({ package: pkg });
    }
    if (action === "regenerate") {
      const existing = getTourPackageById(id);
      if (!existing) return apiError("Package not found", 404);
      const pkg = await generateTourPackage({
        destination: existing.destination,
        durationDays: existing.duration,
        hotelId: existing.hotel.hotelId,
        vehicleId: existing.vehicle.vehicleId,
        useGeneratedHotel: existing.hotel.mode === "generated",
        useGeneratedVehicle: existing.vehicle.mode === "generated",
        marginPercent: existing.priceBreakdown.marginPercent,
        createdBy: actorId,
      });
      await deleteTourPackage(id);
      return apiSuccess({ package: pkg });
    }

    const fields = parsed.data.updates ?? {};
    const pkg = await updateTourPackage(id, fields as Parameters<typeof updateTourPackage>[1]);
    return apiSuccess({ package: pkg });
  } catch (err) {
    console.error("Update AI package error:", err);
    return apiError(err instanceof Error ? err.message : "Failed to update package", 500);
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

    await hydrateTourPackagesStore();
    await deleteTourPackage(id);
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error("Delete AI package error:", err);
    return apiError("Failed to delete package", 500);
  }
}
