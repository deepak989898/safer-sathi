import { resolveFirebaseAdminCredentials } from "@/lib/firebase/resolve-admin-credentials";

let dbReady = false;
let lastInitError: string | null = null;

export function isAdminEnvConfigured(): boolean {
  return resolveFirebaseAdminCredentials() !== null;
}

export function getFirebaseAdminInitError(): string | null {
  return lastInitError;
}

export function getFirebaseAdminStatus(): {
  configured: boolean;
  ready: boolean;
  error: string | null;
} {
  return {
    configured: isAdminEnvConfigured(),
    ready: dbReady && lastInitError === null,
    error: lastInitError,
  };
}

export async function getSafeAdminDb() {
  if (!isAdminEnvConfigured()) {
    lastInitError = "Firebase Admin credentials are not configured on the server.";
    dbReady = false;
    return null;
  }

  try {
    const { getAdminDb } = await import("@/lib/firebase/admin-db");
    const db = getAdminDb();
    lastInitError = null;
    dbReady = true;
    return db;
  } catch (error) {
    lastInitError =
      error instanceof Error ? error.message : "Firebase Admin Firestore init failed.";
    console.error("Firebase Admin DB init failed:", error);
    dbReady = false;
    return null;
  }
}

/** Loads firebase-admin/auth — may fail on Vercel (ERR_REQUIRE_ESM). Prefer auth-rest-admin.ts. */
export async function getSafeAdminAuth() {
  if (!isAdminEnvConfigured()) {
    lastInitError = "Firebase Admin credentials are not configured on the server.";
    return null;
  }

  try {
    const { getAdminAuth } = await import("@/lib/firebase/admin-auth");
    return getAdminAuth();
  } catch (error) {
    lastInitError =
      error instanceof Error ? error.message : "Firebase Admin Auth init failed.";
    console.error("Firebase Admin Auth init failed:", error);
    return null;
  }
}
