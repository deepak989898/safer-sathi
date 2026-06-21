import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { resolveFirebaseAdminCredentials } from "@/lib/firebase/resolve-admin-credentials";

let adminApp: App | undefined;

export function getAdminApp(): App {
  if (adminApp) return adminApp;

  if (getApps().length) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const credentials = resolveFirebaseAdminCredentials();
  if (!credentials) {
    throw new Error("Firebase Admin credentials not configured");
  }

  adminApp = initializeApp({
    credential: cert(credentials),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });

  return adminApp;
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function isAdminConfigured(): boolean {
  return resolveFirebaseAdminCredentials() !== null;
}
