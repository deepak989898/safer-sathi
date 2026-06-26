import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { resolveFirebaseAdminCredentials } from "@/lib/firebase/resolve-admin-credentials";

const ADMIN_APP_NAME = "safar-sathi-admin";

export function getAdminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP_NAME);
  if (existing) return existing;

  const credentials = resolveFirebaseAdminCredentials();
  if (!credentials) {
    throw new Error("Firebase Admin credentials not configured");
  }

  return initializeApp(
    {
      credential: cert(credentials),
      projectId: credentials.projectId,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    },
    ADMIN_APP_NAME
  );
}

export function isAdminConfigured(): boolean {
  return resolveFirebaseAdminCredentials() !== null;
}
