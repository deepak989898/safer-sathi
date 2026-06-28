import { requireBookingsStaffAuth } from "@/lib/admin/api-auth";
import { getCustomerProfileDetail } from "@/lib/admin/customer-insights";
import { canManageUser } from "@/lib/auth/constants";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { id } = await params;
    const profile = await getCustomerProfileDetail(id);
    if (!profile) return apiError("Customer not found", 404);

    if (auth.user.role === "sales_agent" && profile.user.role !== "customer") {
      return apiError("Forbidden", 403);
    }
    if (
      auth.user.role === "manager" &&
      !canManageUser(auth.user.role, profile.user.role)
    ) {
      return apiError("Forbidden", 403);
    }

    return apiSuccess(profile);
  } catch (err) {
    console.error("Customer profile error:", err);
    return apiError("Failed to load customer profile", 500);
  }
}
