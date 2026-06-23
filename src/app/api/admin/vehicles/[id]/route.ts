import { z } from "zod";
import { actorRoleSchema, requireStaffRole } from "@/lib/admin/api-auth";
import {
  deleteVehicleFromStore,
  getVehicleByIdAdmin,
  reloadVehiclesStore,
  updateVehicleInStore,
} from "@/lib/vehicle-store";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const bodySchema = z.object({
  actorRole: actorRoleSchema,
  updates: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }
    if (!requireStaffRole(parsed.data.actorRole)) {
      return apiError("Forbidden", 403);
    }

    await reloadVehiclesStore();
    if (!getVehicleByIdAdmin(id)) return apiError("Vehicle not found", 404);

    const updated = await updateVehicleInStore(id, parsed.data.updates as never);
    return apiSuccess(updated);
  } catch (err) {
    console.error("Update vehicle error:", err);
    return apiError("Failed to update vehicle", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const actorRole = actorRoleSchema.safeParse(searchParams.get("actorRole"));
    if (!actorRole.success) return apiError("actorRole required", 400);
    if (!requireStaffRole(actorRole.data)) return apiError("Forbidden", 403);

    await reloadVehiclesStore();
    const deleted = await deleteVehicleFromStore(id);
    if (!deleted) return apiError("Vehicle not found", 404);
    return apiSuccess({ id });
  } catch (err) {
    console.error("Delete vehicle error:", err);
    return apiError("Failed to delete vehicle", 500);
  }
}
