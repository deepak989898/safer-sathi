import { resolveAuthAccessToken } from "@/lib/auth/auth-token-bridge";
import { loadAdminAnalyticsAction } from "@/app/admin/actions";
import { adminApiFetch, parseApiJson } from "@/lib/admin/api-client";
import type { getAdminAnalytics } from "@/lib/analytics-service";
import { isFirebaseConfigured } from "@/lib/firebase/client";

export type AdminAnalyticsPayload = Awaited<ReturnType<typeof getAdminAnalytics>>;

async function resolveFreshIdToken(): Promise<string> {
  if (isFirebaseConfigured()) {
    const { getFirebaseAuth } = await import("@/lib/firebase/client");
    const auth = getFirebaseAuth();
    await auth.authStateReady();
    if (!auth.currentUser) {
      throw new Error("Session expired. Please sign in again.");
    }
    return auth.currentUser.getIdToken(true);
  }
  return resolveAuthAccessToken();
}

export async function fetchAdminAnalytics(): Promise<{
  success: boolean;
  data?: AdminAnalyticsPayload;
  error?: string;
}> {
  const idToken = await resolveFreshIdToken();

  const actionResult = await loadAdminAnalyticsAction(idToken);
  if (actionResult.success) {
    return { success: true, data: actionResult.data };
  }

  // Fallback for older deployments or action failures.
  try {
    const res = await adminApiFetch("/api/admin/analytics");
    const json = await parseApiJson<{
      success?: boolean;
      data?: AdminAnalyticsPayload;
      error?: string;
    }>(res);
    if (json.success && json.data) {
      return { success: true, data: json.data };
    }
    return {
      success: false,
      error: json.error ?? actionResult.error ?? `Request failed (${res.status})`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : actionResult.error ?? "Failed to load analytics",
    };
  }
}
