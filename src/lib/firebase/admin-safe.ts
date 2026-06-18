type AdminModule = typeof import("./admin");

let adminModule: AdminModule | null = null;
let adminLoadFailed = false;

export function isAdminEnvConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

export async function getSafeFirebaseAdmin(): Promise<AdminModule | null> {
  if (adminLoadFailed) return null;
  if (adminModule) return adminModule;

  if (!isAdminEnvConfigured()) return null;

  try {
    adminModule = await import("./admin");
    return adminModule;
  } catch (error) {
    console.warn("Firebase Admin module failed to load:", error);
    adminLoadFailed = true;
    return null;
  }
}

export async function getSafeAdminDb() {
  const admin = await getSafeFirebaseAdmin();
  if (!admin) return null;
  try {
    return admin.getAdminDb();
  } catch (error) {
    console.warn("Firebase Admin DB init failed:", error);
    return null;
  }
}
