import { z } from "zod";
import { actorRoleSchema, requireStaffRole } from "@/lib/admin/api-auth";
import {
  approveVehicleInStore,
  deleteVehicleFromStore,
  getVehicleByIdAdmin,
  reloadVehiclesStore,
  rejectVehicleInStore,
  updateVehicleInStore,
} from "@/lib/vehicle-store";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { CatalogPersistenceError } from "@/lib/catalog/persistence";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  actorRole: actorRoleSchema,
  updates: z.record(z.string(), z.unknown()).optional(),
});

const actionSchema = z.object({
  actorRole: actorRoleSchema,
  approvedBy: z.string().optional(),
  reason: z.string().optional(),
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
    if (!updated) return apiError("Vehicle not found", 404);
    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof CatalogPersistenceError) {
      console.error("Vehicle persist error:", err);
      return apiError(err.message, 503);
    }
    console.error("Update vehicle error:", err);
    return apiError("Failed to update vehicle", 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }
    if (parsed.data.actorRole !== "super_admin") {
      return apiError("Only super admin can approve or reject vehicles", 403);
    }

    await reloadVehiclesStore();
    if (!getVehicleByIdAdmin(id)) return apiError("Vehicle not found", 404);

    if (action === "approve") {
      const approved = await approveVehicleInStore(
        id,
        parsed.data.approvedBy ?? "super_admin"
      );
      if (!approved) return apiError("Vehicle not found", 404);
      await reloadVehiclesStore();
      return apiSuccess(getVehicleByIdAdmin(id) ?? approved);
    }

    if (action === "reject") {
      const rejected = await rejectVehicleInStore(id, parsed.data.reason);
      if (!rejected) return apiError("Vehicle not found", 404);
      await reloadVehiclesStore();
      return apiSuccess(getVehicleByIdAdmin(id) ?? rejected);
    }

    return apiError("Unknown action. Use ?action=approve or ?action=reject", 400);
  } catch (err) {
    console.error("Vehicle action error:", err);
    return apiError("Failed to process vehicle action", 500);
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
