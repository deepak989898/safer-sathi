import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { localGetSession } from "@/lib/auth/local-auth-store";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

function waitForFirebaseUser(timeoutMs = 8000): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();

  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      unsubscribe();
      reject(new Error("Not authenticated"));
    }, timeoutMs);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      window.clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  if (isFirebaseConfigured()) {
    const currentUser = await waitForFirebaseUser();
    const token = await currentUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }

  const session = localGetSession();
  if (session && process.env.NODE_ENV === "development") {
    return {
      Authorization: "Bearer dev-local",
      "X-User-Id": session.id,
      "X-User-Role": session.role,
      "X-User-Email": session.email,
    };
  }

  throw new Error("Not authenticated");
}

export async function adminApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const authHeaders = await getApiAuthHeaders();
  const headers = new Headers(init?.headers);
  for (const [key, value] of Object.entries(authHeaders)) {
    headers.set(key, value);
  }
  return fetch(input, { ...init, headers });
}

export async function customerApiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return adminApiFetch(input, init);
}
