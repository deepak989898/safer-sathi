import { requireAnyStaffAuth } from "@/lib/admin/api-auth";
import { getFirebaseAdminStatus, getSafeAdminDb } from "@/lib/firebase/admin-safe";
import { apiSuccess } from "@/lib/api-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAnyStaffAuth(request);
  if ("error" in auth) return auth.error;

  const status = getFirebaseAdminStatus();
  const db = await getSafeAdminDb();
  return apiSuccess({
    ...status,
    firestoreConnected: db !== null,
  });
}
