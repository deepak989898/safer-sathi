import { requireSuperAdminAuth } from "@/lib/admin/api-auth";

export { actorRoleSchema } from "@/lib/admin/api-auth";

export async function requireAICenterAuth(request: Request) {
  return requireSuperAdminAuth(request);
}

/** @deprecated Use requireAICenterAuth(request) instead */
export async function parseSuperAdminRole(request: Request) {
  return requireAICenterAuth(request);
}

export function requireAICenterAccess() {
  return null;
}
