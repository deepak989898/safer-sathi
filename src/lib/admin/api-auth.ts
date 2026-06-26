import { z } from "zod";
import { apiError } from "@/lib/api-response";
import {
  authenticateRequest,
  type AuthenticatedUser,
  type AuthResult,
} from "@/lib/auth/server-auth";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import type { UserRole } from "@/types";

export const actorRoleSchema = z.enum([
  "super_admin",
  "manager",
  "sales_agent",
  "support_agent",
  "driver",
  "customer",
]);

export function requireStaffRole(role: UserRole) {
  return role === "super_admin" || role === "manager";
}

export function requireBookingsStaffRole(role: UserRole) {
  return ["super_admin", "manager", "sales_agent", "support_agent", "driver"].includes(
    role
  );
}

export function requireManagerAnalyticsRole(role: UserRole) {
  return role === "super_admin" || role === "manager";
}

type AuthGuardResult = AuthResult;

async function guard(
  request: Request,
  check: (role: UserRole) => boolean,
  message: string
): Promise<AuthGuardResult> {
  const auth = await authenticateRequest(request);
  if ("error" in auth) return auth;
  if (!check(auth.user.role)) {
    return { error: apiError(message, 403) };
  }
  return auth;
}

export async function requireStaffAuth(request: Request): Promise<AuthGuardResult> {
  return guard(request, requireStaffRole, "Forbidden");
}

export async function requireBookingsStaffAuth(request: Request): Promise<AuthGuardResult> {
  return guard(request, requireBookingsStaffRole, "Forbidden");
}

export async function requireSuperAdminAuth(request: Request): Promise<AuthGuardResult> {
  return guard(request, canAccessAICenter, "Only Super Admin can access this resource");
}

export async function requireManagerAnalyticsAuth(
  request: Request
): Promise<AuthGuardResult> {
  return guard(
    request,
    requireManagerAnalyticsRole,
    "Only Super Admin and Manager can access analytics"
  );
}

export async function requireAnyStaffAuth(request: Request): Promise<AuthGuardResult> {
  return guard(request, (role) => role !== "customer", "Forbidden");
}

export function getActorId(user: AuthenticatedUser): string {
  return user.id;
}
