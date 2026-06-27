import { createSign } from "node:crypto";
import {
  resolveFirebaseAdminCredentials,
  type FirebaseAdminCredentials,
} from "@/lib/firebase/resolve-admin-credentials";

const IDENTITY_SCOPE = "https://www.googleapis.com/auth/identitytoolkit";
const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const IDENTITY_TOOLKIT_BASE = "https://identitytoolkit.googleapis.com/v1";
const CUSTOM_TOKEN_AUD =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function getProjectId(): string | null {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    resolveFirebaseAdminCredentials()?.projectId ||
    null
  );
}

function getCredentials(): FirebaseAdminCredentials | null {
  return resolveFirebaseAdminCredentials();
}

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(
  payload: Record<string, unknown>,
  privateKey: string
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${header}.${body}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64UrlEncode(signer.sign(privateKey));
  return `${unsigned}.${signature}`;
}

async function getGoogleAccessToken(): Promise<string | null> {
  const credentials = getCredentials();
  if (!credentials) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60) {
    return cachedAccessToken.token;
  }

  const assertion = signJwt(
    {
      iss: credentials.clientEmail,
      sub: credentials.clientEmail,
      aud: OAUTH_TOKEN_URL,
      iat: now,
      exp: now + 3600,
      scope: `${IDENTITY_SCOPE} ${CLOUD_PLATFORM_SCOPE}`,
    },
    credentials.privateKey
  );

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  } | null;

  if (!res.ok || !data?.access_token) {
    console.error(
      "Firebase auth REST access token failed:",
      data?.error_description ?? data?.error ?? res.status
    );
    return null;
  }

  cachedAccessToken = {
    token: data.access_token,
    expiresAt: now + Number(data.expires_in ?? 3600),
  };

  return data.access_token;
}

async function identityToolkitRequest<T>(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const projectId = getProjectId();
  const accessToken = await getGoogleAccessToken();

  if (!projectId || !accessToken) {
    return {
      ok: false,
      status: 503,
      message: "Firebase Admin credentials are not configured on the server.",
    };
  }

  const res = await fetch(`${IDENTITY_TOOLKIT_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      targetProjectId: projectId,
      ...body,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as
    | T
    | { error?: { message?: string } }
    | null;

  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } } | null)?.error?.message ??
      `Identity Toolkit request failed (${res.status})`;
    return { ok: false, status: res.status, message };
  }

  return { ok: true, data: data as T };
}

export interface RestAuthUser {
  localId: string;
  email?: string;
  displayName?: string;
}

export async function lookupAuthUserByEmail(
  email: string
): Promise<RestAuthUser | null> {
  const projectId = getProjectId();
  if (!projectId) return null;

  const result = await identityToolkitRequest<{
    users?: Array<{ localId?: string; email?: string; displayName?: string }>;
  }>(`/projects/${projectId}/accounts:lookup`, {
    email: [email.toLowerCase().trim()],
  });

  if (!result.ok) {
    if (result.status === 400 && result.message.includes("EMAIL_NOT_FOUND")) {
      return null;
    }
    console.warn("lookupAuthUserByEmail failed:", result.message);
    return null;
  }

  const user = result.data.users?.[0];
  if (!user?.localId) return null;

  return {
    localId: user.localId,
    email: user.email,
    displayName: user.displayName,
  };
}

export async function createAuthUser(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<RestAuthUser | { error: string }> {
  const projectId = getProjectId();
  if (!projectId) {
    return { error: "Firebase Admin credentials are not configured on the server." };
  }

  const result = await identityToolkitRequest<{ localId?: string; email?: string }>(
    `/projects/${projectId}/accounts`,
    {
      email: input.email.toLowerCase().trim(),
      password: input.password,
      displayName: input.displayName,
      emailVerified: false,
      disabled: false,
    }
  );

  if (!result.ok) {
    return { error: result.message };
  }

  if (!result.data.localId) {
    return { error: "Firebase did not return a user id." };
  }

  return {
    localId: result.data.localId,
    email: result.data.email ?? input.email,
    displayName: input.displayName,
  };
}

export async function updateAuthUser(input: {
  localId: string;
  email?: string;
  password?: string;
  displayName?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const projectId = getProjectId();
  if (!projectId) {
    return { ok: false, error: "Firebase Admin credentials are not configured on the server." };
  }

  const result = await identityToolkitRequest<Record<string, unknown>>(
    `/projects/${projectId}/accounts:update`,
    {
      localId: input.localId,
      ...(input.email ? { email: input.email.toLowerCase().trim() } : {}),
      ...(input.password ? { password: input.password } : {}),
      ...(input.displayName ? { displayName: input.displayName } : {}),
      emailVerified: false,
      disableUser: false,
    }
  );

  if (!result.ok) {
    return { ok: false, error: result.message };
  }

  return { ok: true };
}

/** Create a Firebase custom token without firebase-admin/auth (Vercel-safe). */
export async function createFirebaseCustomToken(
  uid: string,
  claims?: Record<string, unknown>
): Promise<string | null> {
  const credentials = getCredentials();
  if (!credentials) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iss: credentials.clientEmail,
    sub: credentials.clientEmail,
    aud: CUSTOM_TOKEN_AUD,
    iat: now,
    exp: now + 3600,
    uid,
  };

  if (claims && Object.keys(claims).length > 0) {
    payload.claims = claims;
  }

  try {
    return signJwt(payload, credentials.privateKey);
  } catch (error) {
    console.error("createFirebaseCustomToken failed:", error);
    return null;
  }
}

export function isFirebaseAuthRestAvailable(): boolean {
  return Boolean(getCredentials() && getProjectId());
}
