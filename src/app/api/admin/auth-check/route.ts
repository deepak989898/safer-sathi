import { requireManagerAnalyticsAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { isTokenVerificationAvailable } from "@/lib/firebase/admin-verify";
import { resolveFirebaseAdminCredentials } from "@/lib/firebase/resolve-admin-credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lightweight auth health check for admin debugging (no sensitive data). */
export async function GET(request: Request) {
  const auth = await requireManagerAnalyticsAuth(request);
  if ("error" in auth) return auth.error;

  const credentials = resolveFirebaseAdminCredentials();

  return apiSuccess({
    userId: auth.user.id,
    role: auth.user.role,
    email: auth.user.email,
    tokenVerification: isTokenVerificationAvailable(),
    adminCredentialsConfigured: isAdminEnvConfigured(),
    projectId: credentials?.projectId ?? null,
  });
}
