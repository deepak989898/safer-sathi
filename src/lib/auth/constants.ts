import type { UserRole } from "@/types";

export const STAFF_ROLES: UserRole[] = [
  "manager",
  "sales_agent",
  "support_agent",
  "driver",
];

export const ADMIN_ROLES: UserRole[] = ["super_admin", "manager"];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  manager: "Manager",
  sales_agent: "Sales Agent",
  support_agent: "Support Agent",
  driver: "Driver",
  customer: "Customer",
};

export function isStaffRole(role: UserRole): boolean {
  return role !== "customer";
}

export function canAccessAdmin(role: UserRole): boolean {
  return role !== "customer";
}

export function getLoginRedirect(role: UserRole): string {
  switch (role) {
    case "super_admin":
    case "manager":
      return "/admin";
    case "sales_agent":
      return "/admin/bookings";
    case "support_agent":
      return "/admin/support";
    case "driver":
      return "/admin/bookings";
    case "customer":
    default:
      return "/my-bookings";
  }
}

export function canApproveUsers(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}

export {
  canApprovePackages,
  canEditPackageDrafts,
  canGenerateMarketPackages,
  canManageUser,
  MANAGER_MANAGEABLE_ROLES,
} from "./permissions";
