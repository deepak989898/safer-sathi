import { requireBookingsStaffAuth } from "@/lib/admin/api-auth";
import {
  buildCustomerListItems,
  listUsersFromFirestore,
} from "@/lib/admin/customer-insights";
import { canManageUser } from "@/lib/auth/constants";
import { apiError, apiSuccess } from "@/lib/api-response";
import type { UserRole } from "@/types";

export async function GET(request: Request) {
  try {
    const auth = await requireBookingsStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role");

    let users = await listUsersFromFirestore();
    const actorRole = auth.user.role;

    users = users.filter((u) => {
      if (actorRole === "sales_agent") return u.role === "customer";
      if (actorRole === "manager") return canManageUser(actorRole, u.role);
      return true;
    });

    if (roleParam && roleParam !== "all") {
      users = users.filter((u) => u.role === (roleParam as UserRole));
    }

    const customers = await buildCustomerListItems(users);

    return apiSuccess({ customers });
  } catch (err) {
    console.error("List customers error:", err);
    return apiError("Failed to load customers", 500);
  }
}
