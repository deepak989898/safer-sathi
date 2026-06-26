import type { UserRole, UserStatus } from "@/types";
import type { AuthenticatedUser } from "@/lib/auth/server-auth";

function parseFirestoreStringField(
  fields: Record<string, { stringValue?: string; booleanValue?: boolean }> | undefined,
  key: string
): string | undefined {
  const value = fields?.[key];
  if (!value) return undefined;
  if (value.stringValue !== undefined) return value.stringValue;
  return undefined;
}

function parseFirestoreBoolField(
  fields: Record<string, { booleanValue?: boolean }> | undefined,
  key: string
): boolean | undefined {
  return fields?.[key]?.booleanValue;
}

/** Read the signed-in user's own profile via Firestore REST + their ID token (rules: isOwner). */
export async function loadUserProfileWithIdToken(
  uid: string,
  idToken: string
): Promise<AuthenticatedUser | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  if (!projectId) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const doc = (await res.json()) as {
      fields?: Record<string, { stringValue?: string; booleanValue?: boolean }>;
    };

    const fields = doc.fields;
    if (!fields) return null;

    return {
      id: uid,
      email: parseFirestoreStringField(fields, "email") ?? "",
      name: parseFirestoreStringField(fields, "name") ?? "",
      role: (parseFirestoreStringField(fields, "role") as UserRole | undefined) ?? "customer",
      status: (parseFirestoreStringField(fields, "status") as UserStatus | undefined) ?? "active",
      approved: parseFirestoreBoolField(fields, "approved") ?? true,
    };
  } catch (error) {
    console.warn("Firestore REST profile load failed:", error);
    return null;
  }
}
