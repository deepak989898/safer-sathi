import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { resolveFirebaseAdminCredentials } from "@/lib/firebase/resolve-admin-credentials";

let verifyApp: App | undefined;

function getProjectId(): string | null {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    null
  );
}

/** Auth client for ID token verification — works with full credentials or project ID only. */
export async function getAuthForTokenVerification(): Promise<Auth | null> {
  const projectId = getProjectId();
  if (!projectId) return null;

  const credentials = resolveFirebaseAdminCredentials();

  if (credentials) {
    try {
      const { getAdminAuth } = await import("@/lib/firebase/admin-auth");
      return getAdminAuth();
    } catch (error) {
      console.error("Full Firebase Admin auth init failed:", error);
    }
  }

  try {
    if (!verifyApp) {
      if (getApps().length) {
        verifyApp = getApps()[0];
      } else {
        verifyApp = credentials
          ? initializeApp({
              credential: cert(credentials),
              projectId: credentials.projectId,
            })
          : initializeApp({ projectId });
      }
    }
    return getAuth(verifyApp);
  } catch (error) {
    console.error("Firebase token verification auth init failed:", error);
    return null;
  }
}

export function isTokenVerificationAvailable(): boolean {
  return Boolean(getProjectId());
}
