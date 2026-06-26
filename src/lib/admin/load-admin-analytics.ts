import { resolveAuthAccessToken } from "@/lib/auth/auth-token-bridge";
import { loadAdminAnalyticsAction } from "@/app/admin/actions";
import { parseApiJson, resolveAdminApiUrl } from "@/lib/admin/api-client";
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

async function postAdminAnalytics(idToken: string): Promise<{
  success: boolean;
  data?: AdminAnalyticsPayload;
  error?: string;
  status?: number;
}> {
  const res = await fetch(resolveAdminApiUrl("/api/admin/analytics"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
  });

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
    error: json.error ?? `Request failed (${res.status})`,
    status: res.status,
  };
}

export async function fetchAdminAnalytics(): Promise<{
  success: boolean;
  data?: AdminAnalyticsPayload;
  error?: string;
}> {
  const idToken = await resolveFreshIdToken();

  const apiResult = await postAdminAnalytics(idToken);
  if (apiResult.success && apiResult.data) {
    return { success: true, data: apiResult.data };
  }

  const actionResult = await loadAdminAnalyticsAction(idToken);
  if (actionResult.success) {
    return { success: true, data: actionResult.data };
  }

  return {
    success: false,
    error: apiResult.error ?? actionResult.error ?? "Failed to load analytics",
  };
}
