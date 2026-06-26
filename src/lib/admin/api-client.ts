import { localGetSession } from "@/lib/auth/local-auth-store";
import { resolveAuthAccessToken } from "@/lib/auth/auth-token-bridge";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { PRODUCTION_DOMAIN, WWW_DOMAIN } from "@/lib/site-config";

async function waitForAuthReady(timeoutMs = 12_000): Promise<void> {
  if (!isFirebaseConfigured()) return;

  const { getFirebaseAuth } = await import("@/lib/firebase/client");
  const auth = getFirebaseAuth();
  await auth.authStateReady();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (auth.currentUser) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error("Session expired. Please sign in again.");
}

/**
 * Vercel redirects thesafarsathi.com/api/* → www (308). Browsers drop Authorization
 * on that redirect. Always call the www API in production.
 */
export function resolveAdminApiUrl(input: string): string {
  if (!input.startsWith("/api/")) return input;
  if (typeof window === "undefined") return input;

  const host = window.location.hostname.toLowerCase();
  if (process.env.NODE_ENV === "production" || host === PRODUCTION_DOMAIN) {
    return `https://${WWW_DOMAIN}${input}`;
  }

  return input;
}

function resolveApiUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== "string" || !input.startsWith("/api/")) {
    return input;
  }
  if (typeof window === "undefined") {
    return input;
  }

  return resolveAdminApiUrl(input);
}

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  if (isFirebaseConfigured()) {
    await waitForAuthReady();
    const auth = (await import("@/lib/firebase/client")).getFirebaseAuth();
    const token = await auth.currentUser!.getIdToken(true);
    return { Authorization: `Bearer ${token}` };
  }

  const session = localGetSession();
  if (session && process.env.NODE_ENV === "development") {
    return {
      Authorization: "Bearer dev-local",
      "X-User-Id": session.id,
      "X-User-Role": session.role,
      "X-User-Email": session.email,
    };
  }

  throw new Error("Not authenticated");
}

export async function parseApiJson<T>(res: Response): Promise<T> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const preview = (await res.text()).slice(0, 120);
    throw new Error(
      res.ok
        ? "Server returned an unexpected response."
        : `Server error (${res.status}). ${preview.startsWith("<!") ? "Try redeploying the site." : preview}`
    );
  }
  return (await res.json()) as T;
}

export async function adminApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const authHeaders = await getApiAuthHeaders();
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(authHeaders)) {
    headers.set(key, value);
  }

  return fetch(resolveApiUrl(input), {
    ...init,
    headers,
    cache: init?.cache ?? "no-store",
  });
}

export async function customerApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return adminApiFetch(input, init);
}
