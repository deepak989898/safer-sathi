import { localGetSession } from "@/lib/auth/local-auth-store";
import { resolveAuthAccessToken } from "@/lib/auth/auth-token-bridge";
import { isFirebaseConfigured } from "@/lib/firebase/client";
import { PRODUCTION_DOMAIN } from "@/lib/site-config";

const CANONICAL_API_ORIGIN = `https://${PRODUCTION_DOMAIN}`;

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

function resolveFetchUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== "string" || !input.startsWith("/api/")) {
    return input;
  }

  if (typeof window === "undefined") {
    return input;
  }

  const host = window.location.hostname.toLowerCase();
  if (host === "thesafarsathi.com") {
    return `${CANONICAL_API_ORIGIN}${input}`;
  }

  return input;
}

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  if (isFirebaseConfigured()) {
    await waitForAuthReady();
    const token = await resolveAuthAccessToken();
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

  return fetch(resolveFetchUrl(input), {
    ...init,
    headers,
    credentials: "same-origin",
  });
}

export async function customerApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return adminApiFetch(input, init);
}
