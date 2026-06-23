import { resolveFirebaseAdminCredentials } from "@/lib/firebase/resolve-admin-credentials";

type AdminModule = typeof import("./admin");

let adminModule: AdminModule | null = null;
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
    ready: adminModule !== null && lastInitError === null,
    error: lastInitError,
  };
}

export async function getSafeFirebaseAdmin(): Promise<AdminModule | null> {
  if (!isAdminEnvConfigured()) {
    lastInitError = "Firebase Admin credentials are not configured on the server.";
    return null;
  }

  if (adminModule) return adminModule;

  try {
    adminModule = await import("./admin");
    lastInitError = null;
    return adminModule;
  } catch (error) {
    lastInitError =
      error instanceof Error ? error.message : "Firebase Admin module failed to load.";
    console.error("Firebase Admin module failed to load:", error);
    adminModule = null;
    return null;
  }
}

export async function getSafeAdminDb() {
  const admin = await getSafeFirebaseAdmin();
  if (!admin) return null;

  try {
    const db = admin.getAdminDb();
    lastInitError = null;
    return db;
  } catch (error) {
    lastInitError =
      error instanceof Error ? error.message : "Firebase Admin Firestore init failed.";
    console.error("Firebase Admin DB init failed:", error);
    adminModule = null;
    return null;
  }
}

export async function getSafeAdminAuth() {
  const admin = await getSafeFirebaseAdmin();
  if (!admin) return null;

  try {
    return admin.getAdminAuth();
  } catch (error) {
    lastInitError =
      error instanceof Error ? error.message : "Firebase Admin Auth init failed.";
    console.error("Firebase Admin Auth init failed:", error);
    adminModule = null;
    return null;
  }
}
