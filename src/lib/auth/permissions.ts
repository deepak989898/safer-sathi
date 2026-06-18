import type { UserRole } from "@/types";

/** Roles a manager may approve, suspend, or manage — never super_admin or other managers */
export const MANAGER_MANAGEABLE_ROLES: UserRole[] = [
  "sales_agent",
  "driver",
  "customer",
];

export function canManageUser(
  actorRole: UserRole,
  targetRole: UserRole
): boolean {
  if (targetRole === "super_admin") return false;

  if (actorRole === "super_admin") {
    return true;
  }

  if (actorRole === "manager") {
    return MANAGER_MANAGEABLE_ROLES.includes(targetRole);
  }

  return false;
}

export function canApproveUsers(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}

export function canApprovePackages(role: UserRole): boolean {
  return role === "super_admin";
}

export function canGenerateMarketPackages(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}

export function canEditPackageDrafts(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}
