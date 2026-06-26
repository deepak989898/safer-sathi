import { z } from "zod";
import { requireStaffAuth, requireSuperAdminAuth } from "@/lib/admin/api-auth";
import {
  approvePackageInStore,
  deletePackageFromStore,
  getPackageByIdAdmin,
  reloadPackagesStore,
  rejectPackageInStore,
  updatePackageInStore,
} from "@/lib/package-store";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

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

    const parsed = z
      .object({
        updates: z.record(z.string(), z.unknown()),
      })
      .safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    await reloadPackagesStore();
    if (!getPackageByIdAdmin(id)) return apiError("Package not found", 404);

    const updated = await updatePackageInStore(id, parsed.data.updates as never);
    if (!updated) return apiError("Package not found", 404);
    await reloadPackagesStore();
    return apiSuccess(getPackageByIdAdmin(id) ?? updated);
  } catch (err) {
    console.error("Update package error:", err);
    return apiError("Failed to update package", 500);
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

    const parsed = z
      .object({
        approvedBy: z.string().optional(),
        reason: z.string().optional(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    await reloadPackagesStore();
    if (!getPackageByIdAdmin(id)) return apiError("Package not found", 404);

    if (action === "approve") {
      const approved = await approvePackageInStore(
        id,
        parsed.data.approvedBy ?? auth.user.id
      );
      if (!approved) return apiError("Package not found", 404);
      await reloadPackagesStore();
      return apiSuccess(getPackageByIdAdmin(id) ?? approved);
    }

    if (action === "reject") {
      const rejected = await rejectPackageInStore(id, parsed.data.reason);
      if (!rejected) return apiError("Package not found", 404);
      await reloadPackagesStore();
      return apiSuccess(getPackageByIdAdmin(id) ?? rejected);
    }

    return apiError("Unknown action. Use ?action=approve or ?action=reject", 400);
  } catch (err) {
    console.error("Package action error:", err);
    return apiError("Failed to process package action", 500);
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

    await reloadPackagesStore();
    const deleted = await deletePackageFromStore(id);
    if (!deleted) return apiError("Package not found", 404);
    return apiSuccess({ id });
  } catch (err) {
    console.error("Delete package error:", err);
    return apiError("Failed to delete package", 500);
  }
}
