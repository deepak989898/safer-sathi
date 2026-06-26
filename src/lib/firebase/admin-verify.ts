import {
  isTokenVerificationAvailable,
  verifyFirebaseIdToken,
} from "@/lib/firebase/verify-id-token-rest";

/** @deprecated Use verifyFirebaseIdToken — firebase-admin/auth crashes on Vercel (ERR_REQUIRE_ESM). */
export async function getAuthForTokenVerification(): Promise<null> {
  return null;
}

export { isTokenVerificationAvailable };
