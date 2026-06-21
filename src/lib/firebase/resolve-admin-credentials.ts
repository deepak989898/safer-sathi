export interface FirebaseAdminCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n").trim();
}

/** Supports PEM string, escaped newlines, or full service-account JSON pasted in env. */
export function resolveFirebaseAdminCredentials(): FirebaseAdminCredentials | null {
  const jsonRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
    (process.env.FIREBASE_PRIVATE_KEY?.trim().startsWith("{")
      ? process.env.FIREBASE_PRIVATE_KEY.trim()
      : "");

  if (jsonRaw.startsWith("{")) {
    try {
      const json = JSON.parse(jsonRaw) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      if (json.private_key && json.client_email && json.project_id) {
        return {
          projectId: process.env.FIREBASE_PROJECT_ID?.trim() || json.project_id,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim() || json.client_email,
          privateKey: normalizePrivateKey(json.private_key),
        };
      }
    } catch {
      // Fall through to PEM parsing below.
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (!projectId || !clientEmail || !privateKey || privateKey.startsWith("{")) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}
