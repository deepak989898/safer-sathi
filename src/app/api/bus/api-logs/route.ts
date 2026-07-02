import { requireStaffAuth } from "@/lib/admin/api-auth";
import { listBusApiLogs } from "@/lib/bus/firestore";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  const staff = await requireStaffAuth(request);
  if ("error" in staff) return staff.error;

  try {
    const logs = await listBusApiLogs(80);
    return apiSuccess({ logs });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : "Failed to load logs", 500);
  }
}
