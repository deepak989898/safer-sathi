import { z } from "zod";
import { actorRoleSchema, requireStaffRole } from "@/lib/admin/api-auth";
import {
  approveHotelInStore,
  deleteHotelFromStore,
  getHotelByIdAdmin,
  reloadHotelsStore,
  rejectHotelInStore,
  updateHotelInStore,
} from "@/lib/hotel-store";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

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

    await reloadHotelsStore();
    if (!getHotelByIdAdmin(id)) return apiError("Hotel not found", 404);

    const updated = await updateHotelInStore(id, parsed.data.updates as never);
    if (!updated) return apiError("Hotel not found", 404);
    await reloadHotelsStore();
    return apiSuccess(getHotelByIdAdmin(id) ?? updated);
  } catch (err) {
    console.error("Update hotel error:", err);
    return apiError("Failed to update hotel", 500);
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
      return apiError("Only super admin can approve or reject hotels", 403);
    }

    await reloadHotelsStore();
    if (!getHotelByIdAdmin(id)) return apiError("Hotel not found", 404);

    if (action === "approve") {
      const approved = await approveHotelInStore(
        id,
        parsed.data.approvedBy ?? "super_admin"
      );
      if (!approved) return apiError("Hotel not found", 404);
      await reloadHotelsStore();
      return apiSuccess(getHotelByIdAdmin(id) ?? approved);
    }

    if (action === "reject") {
      const rejected = await rejectHotelInStore(id, parsed.data.reason);
      if (!rejected) return apiError("Hotel not found", 404);
      await reloadHotelsStore();
      return apiSuccess(getHotelByIdAdmin(id) ?? rejected);
    }

    return apiError("Unknown action. Use ?action=approve or ?action=reject", 400);
  } catch (err) {
    console.error("Hotel action error:", err);
    return apiError("Failed to process hotel action", 500);
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

    await reloadHotelsStore();
    const deleted = await deleteHotelFromStore(id);
    if (!deleted) return apiError("Hotel not found", 404);
    return apiSuccess({ id });
  } catch (err) {
    console.error("Delete hotel error:", err);
    return apiError("Failed to delete hotel", 500);
  }
}
