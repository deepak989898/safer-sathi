/** Firestore-only entry — does not load firebase-admin/auth (avoids jose/jwks ESM errors on Vercel). */
export { getAdminApp, isAdminConfigured } from "@/lib/firebase/admin-app";
export { getAdminDb } from "@/lib/firebase/admin-db";
