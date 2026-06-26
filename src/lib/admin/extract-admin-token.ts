import {
  authenticateBearerToken,
  authenticateRequest,
  extractTokenFromAuthorizationHeader,
  type AuthResult,
} from "@/lib/auth/server-auth";

/** Bearer header (GET) or JSON body `{ idToken }` (POST) — avoids lost headers on apex→www redirects. */
export async function authenticateAdminRequest(request: Request): Promise<AuthResult> {
  const headerToken = extractTokenFromAuthorizationHeader(
    request.headers.get("Authorization")
  );

  if (headerToken) {
    if (headerToken === "dev-local") {
      return authenticateRequest(request);
    }
    return authenticateBearerToken(headerToken);
  }

  if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
    try {
      const body = (await request.json()) as { idToken?: unknown };
      if (typeof body.idToken === "string" && body.idToken.trim()) {
        return authenticateBearerToken(body.idToken.trim());
      }
    } catch {
      // ignore malformed JSON
    }
  }

  return { error: (await import("@/lib/api-response")).apiError("Unauthorized", 401) };
}
