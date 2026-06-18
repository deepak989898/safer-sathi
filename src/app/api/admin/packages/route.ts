import { getAdminPackages } from "@/lib/package-store";
import { apiError, apiSuccess } from "@/lib/api-response";
import type { PackagePublishStatus } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as PackagePublishStatus | null;
    const packages = getAdminPackages(status ?? undefined);
    return apiSuccess(packages);
  } catch (err) {
    console.error("List packages error:", err);
    return apiError("Failed to list packages", 500);
  }
}
