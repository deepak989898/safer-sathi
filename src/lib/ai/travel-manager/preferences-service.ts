import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import type { AITravelPreferences } from "@/types/travel-manager";
import type { Locale } from "@/types";

const GUEST_COLLECTION = "ai_guest_preferences";

export async function getUserAiPreferences(
  userId: string
): Promise<AITravelPreferences | null> {
  if (!isAdminEnvConfigured() || userId === "guest") return null;
  try {
    const db = await getSafeAdminDb();
    if (!db) return null;
    const doc = await db.collection("users").doc(userId).get();
    if (!doc.exists) return null;
    const data = doc.data();
    return (data?.aiPreferences as AITravelPreferences) ?? null;
  } catch {
    return null;
  }
}

export async function saveUserAiPreferences(
  userId: string,
  preferences: AITravelPreferences
): Promise<void> {
  if (!isAdminEnvConfigured() || userId === "guest") return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    const locale: Locale = preferences.preferredLanguage === "hindi" ? "hi" : "en";
    await db.collection("users").doc(userId).set(
      {
        aiPreferences: preferences,
        locale,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn("saveUserAiPreferences failed:", error);
  }
}

export async function saveGuestAiPreferences(
  guestId: string,
  preferences: AITravelPreferences
): Promise<void> {
  if (!isAdminEnvConfigured() || !guestId) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    await db.collection(GUEST_COLLECTION).doc(guestId).set(
      { ...preferences, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  } catch (error) {
    console.warn("saveGuestAiPreferences failed:", error);
  }
}

export async function getGuestAiPreferences(
  guestId: string
): Promise<AITravelPreferences | null> {
  if (!isAdminEnvConfigured() || !guestId) return null;
  try {
    const db = await getSafeAdminDb();
    if (!db) return null;
    const doc = await db.collection(GUEST_COLLECTION).doc(guestId).get();
    if (!doc.exists) return null;
    return doc.data() as AITravelPreferences;
  } catch {
    return null;
  }
}
