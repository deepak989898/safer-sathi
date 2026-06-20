import { z } from "zod";
import { apiError } from "@/lib/api-response";
import type { UserRole } from "@/types";
import { canAccessAICenter } from "./permissions";

export const superAdminRoleSchema = z.literal("super_admin");

export const actorRoleSchema = z.enum([
  "super_admin",
  "manager",
  "sales_agent",
  "support_agent",
  "driver",
  "customer",
]);

export function requireAICenterAccess(role: UserRole) {
  if (!canAccessAICenter(role)) {
    return apiError("Only Super Admin can access AI Center", 403);
  }
  return null;
}

export function parseSuperAdminRole(role: unknown) {
  const parsed = actorRoleSchema.safeParse(role);
  if (!parsed.success) return { error: apiError("Invalid role", 400) };
  const denied = requireAICenterAccess(parsed.data);
  if (denied) return { error: denied };
  return { role: parsed.data as "super_admin" };
}
