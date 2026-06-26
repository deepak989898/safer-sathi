import { z } from "zod";
import { requireStaffAuth, requireSuperAdminAuth } from "@/lib/admin/api-auth";
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

    await reloadHotelsStore();
    if (!getHotelByIdAdmin(id)) return apiError("Hotel not found", 404);

    if (action === "approve") {
      const approved = await approveHotelInStore(
        id,
        parsed.data.approvedBy ?? auth.user.id
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
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;

    await reloadHotelsStore();
    const deleted = await deleteHotelFromStore(id);
    if (!deleted) return apiError("Hotel not found", 404);
    return apiSuccess({ id });
  } catch (err) {
    console.error("Delete hotel error:", err);
    return apiError("Failed to delete hotel", 500);
  }
}
