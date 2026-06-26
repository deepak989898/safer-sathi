import { localGetSession } from "@/lib/auth/local-auth-store";
import { resolveAuthAccessToken } from "@/lib/auth/auth-token-bridge";
import { isFirebaseConfigured } from "@/lib/firebase/client";

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  if (isFirebaseConfigured()) {
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

export async function adminApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const authHeaders = await getApiAuthHeaders();
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(authHeaders)) {
    headers.set(key, value);
  }
  return fetch(input, { ...init, headers });
}

export async function customerApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return adminApiFetch(input, init);
}
