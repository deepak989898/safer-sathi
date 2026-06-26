import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

export async function getFirebaseIdToken(forceRefresh = false): Promise<string> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured");
  }

  const auth = getFirebaseAuth();
  await auth.authStateReady();

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Session expired. Please sign in again.");
  }

  return currentUser.getIdToken(forceRefresh);
}
