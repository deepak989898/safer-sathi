import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { resolveFirebaseAdminCredentials } from "@/lib/firebase/resolve-admin-credentials";

const VERIFY_APP_NAME = "safar-sathi-token-verify";

function getProjectId(): string | null {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    null
  );
}

function getOrCreateVerifyApp(projectId: string, credentials?: ReturnType<typeof resolveFirebaseAdminCredentials>): App {
  const existing = getApps().find((app) => app.name === VERIFY_APP_NAME);
  if (existing) return existing;

  if (credentials) {
    return initializeApp(
      {
        credential: cert(credentials),
        projectId: credentials.projectId,
      },
      VERIFY_APP_NAME
    );
  }

  return initializeApp({ projectId }, VERIFY_APP_NAME);
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
      console.error(
        "Full Firebase Admin auth init failed; falling back to project-id verification:",
        error
      );
    }
  }

  try {
    const app = getOrCreateVerifyApp(projectId, credentials ?? undefined);
    return getAuth(app);
  } catch (error) {
    console.error("Firebase token verification auth init failed:", error);
    return null;
  }
}

export function isTokenVerificationAvailable(): boolean {
  return Boolean(getProjectId());
}
