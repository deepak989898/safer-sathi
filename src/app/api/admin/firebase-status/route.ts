import { getFirebaseAdminStatus, getSafeAdminDb } from "@/lib/firebase/admin-safe";
import { apiSuccess } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = getFirebaseAdminStatus();
  const db = await getSafeAdminDb();
  return apiSuccess({
    ...status,
    firestoreConnected: db !== null,
  });
}
