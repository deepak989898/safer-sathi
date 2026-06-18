import { z } from "zod";
import {
  approvePackageInStore,
  getPackageByIdAdmin,
  rejectPackageInStore,
  updatePackageInStore,
} from "@/lib/package-store";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const actorRoleSchema = z.enum([
  "super_admin",
  "manager",
  "sales_agent",
  "support_agent",
  "driver",
  "customer",
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = z
      .object({
        actorRole: actorRoleSchema,
        updates: z.record(z.string(), z.unknown()),
      })
      .safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    if (!["super_admin", "manager"].includes(parsed.data.actorRole)) {
      return apiError("Only managers and super admins can edit packages", 403);
    }

    if (!getPackageByIdAdmin(id)) return apiError("Package not found", 404);

    const updated = updatePackageInStore(id, parsed.data.updates as never);
    return apiSuccess(updated);
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
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = z
      .object({
        actorRole: actorRoleSchema,
        approvedBy: z.string().optional(),
        reason: z.string().optional(),
      })
      .safeParse(body);

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    if (parsed.data.actorRole !== "super_admin") {
      return apiError("Only super admin can approve or reject packages", 403);
    }

    if (!getPackageByIdAdmin(id)) return apiError("Package not found", 404);

    if (action === "approve") {
      const approved = approvePackageInStore(
        id,
        parsed.data.approvedBy ?? "super_admin"
      );
      return apiSuccess(approved);
    }

    if (action === "reject") {
      const rejected = rejectPackageInStore(id, parsed.data.reason);
      return apiSuccess(rejected);
    }

    return apiError("Unknown action. Use ?action=approve or ?action=reject", 400);
  } catch (err) {
    console.error("Package action error:", err);
    return apiError("Failed to process package action", 500);
  }
}
