export interface FirebaseAdminCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizePrivateKey(value: string): string {
  return stripWrappingQuotes(value).replace(/\\n/g, "\n").trim();
}

function isValidPrivateKey(key: string): boolean {
  return key.includes("BEGIN PRIVATE KEY") && key.includes("END PRIVATE KEY");
}

function resolveFromServiceAccountJson(jsonRaw: string): FirebaseAdminCredentials | null {
  try {
    const json = JSON.parse(jsonRaw) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (!json.private_key || !json.client_email || !json.project_id) return null;

    const privateKey = normalizePrivateKey(json.private_key);
    if (!isValidPrivateKey(privateKey)) return null;

    return {
      projectId:
        process.env.FIREBASE_PROJECT_ID?.trim() ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
        json.project_id,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL?.trim() || json.client_email,
      privateKey,
    };
  } catch {
    return null;
  }
}

/** Supports PEM string, escaped newlines, or full service-account JSON pasted in env. */
export function resolveFirebaseAdminCredentials(): FirebaseAdminCredentials | null {
  const jsonRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
    (process.env.FIREBASE_PRIVATE_KEY?.trim().startsWith("{")
      ? process.env.FIREBASE_PRIVATE_KEY.trim()
      : "");

  if (jsonRaw.startsWith("{")) {
    const fromJson = resolveFromServiceAccountJson(jsonRaw);
    if (fromJson) return fromJson;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (!projectId || !clientEmail || !privateKeyRaw || privateKeyRaw.startsWith("{")) {
    return null;
  }

  const privateKey = normalizePrivateKey(privateKeyRaw);
  if (!isValidPrivateKey(privateKey)) return null;

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}
