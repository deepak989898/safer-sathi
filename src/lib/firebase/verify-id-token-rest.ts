export interface VerifiedFirebaseIdToken {
  uid: string;
  email?: string;
  name?: string;
  role?: string;
}

function getFirebaseWebApiKey(): string | null {
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim() || null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readRoleFromClaims(
  customAttributes: string | undefined,
  jwtPayload: Record<string, unknown> | null
): string | undefined {
  if (customAttributes) {
    try {
      const parsed = JSON.parse(customAttributes) as { role?: string };
      if (typeof parsed.role === "string") return parsed.role;
    } catch {
      // ignore malformed custom attributes
    }
  }

  if (jwtPayload && typeof jwtPayload.role === "string") {
    return jwtPayload.role;
  }

  return undefined;
}

/**
 * Verify a Firebase ID token via Identity Toolkit REST API.
 * Avoids firebase-admin/auth (jwks-rsa + jose ESM crash on Vercel serverless).
 */
export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedFirebaseIdToken | null> {
  const apiKey = getFirebaseWebApiKey();
  if (!apiKey) return null;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    console.warn(
      "Firebase ID token verification failed:",
      body?.error?.message ?? res.status
    );
    return null;
  }

  const data = (await res.json()) as {
    users?: Array<{
      localId?: string;
      email?: string;
      displayName?: string;
      customAttributes?: string;
    }>;
  };

  const user = data.users?.[0];
  if (!user?.localId) return null;

  const jwtPayload = decodeJwtPayload(idToken);

  return {
    uid: user.localId,
    email: user.email,
    name: user.displayName,
    role: readRoleFromClaims(user.customAttributes, jwtPayload),
  };
}

export function isTokenVerificationAvailable(): boolean {
  return Boolean(
    getFirebaseWebApiKey() &&
      (process.env.FIREBASE_PROJECT_ID?.trim() ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim())
  );
}
