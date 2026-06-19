import { z } from "zod";

export const actorRoleSchema = z.enum([
  "super_admin",
  "manager",
  "sales_agent",
  "support_agent",
  "driver",
  "customer",
]);

export function requireStaffRole(role: z.infer<typeof actorRoleSchema>) {
  return ["super_admin", "manager"].includes(role);
}
