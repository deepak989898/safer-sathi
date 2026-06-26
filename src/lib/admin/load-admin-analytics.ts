import { resolveAuthAccessToken } from "@/lib/auth/auth-token-bridge";
import { parseApiJson, resolveAdminApiUrl } from "@/lib/admin/api-client";
import type { getAdminAnalytics } from "@/lib/analytics-service";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { PRODUCTION_DOMAIN, WWW_DOMAIN } from "@/lib/site-config";

export type AdminAnalyticsPayload = Awaited<ReturnType<typeof getAdminAnalytics>>;

function ensureWwwAdminHost(): void {
  if (typeof window === "undefined") return;
  const host = window.location.hostname.toLowerCase();
  if (host !== PRODUCTION_DOMAIN) return;

  const target = `https://${WWW_DOMAIN}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(target);
  throw new Error("Redirecting to www admin…");
}

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

async function readApiResponse<T>(res: Response): Promise<{
  ok: boolean;
  json?: T;
  error?: string;
}> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const preview = (await res.text()).slice(0, 80).replace(/\s+/g, " ");
    return {
      ok: false,
      error: res.ok
        ? "Server returned an unexpected response."
        : `Server error (${res.status})${preview ? `: ${preview}` : ""}`,
    };
  }

  try {
    const json = (await res.json()) as T;
    return { ok: true, json };
  } catch {
    return { ok: false, error: `Invalid JSON response (${res.status})` };
  }
}

async function postAdminAnalytics(idToken: string): Promise<{
  success: boolean;
  data?: AdminAnalyticsPayload;
  error?: string;
}> {
  const res = await fetch(resolveAdminApiUrl("/api/admin/analytics"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
    cache: "no-store",
  });

  const parsed = await readApiResponse<{
    success?: boolean;
    data?: AdminAnalyticsPayload;
    error?: string;
  }>(res);

  if (!parsed.ok || !parsed.json) {
    return { success: false, error: parsed.error ?? `Request failed (${res.status})` };
  }

  const json = parsed.json;
  if (json.success && json.data) {
    return { success: true, data: json.data };
  }

  return {
    success: false,
    error: json.error ?? `Request failed (${res.status})`,
  };
}

export async function fetchAdminAnalytics(): Promise<{
  success: boolean;
  data?: AdminAnalyticsPayload;
  error?: string;
}> {
  ensureWwwAdminHost();

  const idToken = await resolveFreshIdToken();
  const apiResult = await postAdminAnalytics(idToken);

  if (apiResult.success && apiResult.data) {
    return { success: true, data: apiResult.data };
  }

  return {
    success: false,
    error: apiResult.error ?? "Failed to load analytics",
  };
}
