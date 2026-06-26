import { z } from "zod";
import { requireStaffAuth, requireSuperAdminAuth } from "@/lib/admin/api-auth";
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

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  updates: z.record(z.string(), z.unknown()).optional(),
});

const actionSchema = z.object({
  approvedBy: z.string().optional(),
  reason: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
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
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    await reloadVehiclesStore();
    if (!getVehicleByIdAdmin(id)) return apiError("Vehicle not found", 404);

    if (action === "approve") {
      const approved = await approveVehicleInStore(
        id,
        parsed.data.approvedBy ?? auth.user.id
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
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    await reloadVehiclesStore();
    const deleted = await deleteVehicleFromStore(id);
    if (!deleted) return apiError("Vehicle not found", 404);
    return apiSuccess({ id });
  } catch (err) {
    console.error("Delete vehicle error:", err);
    return apiError("Failed to delete vehicle", 500);
  }
}
