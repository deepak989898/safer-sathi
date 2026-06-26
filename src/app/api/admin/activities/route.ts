import { z } from "zod";
import { requireStaffAuth } from "@/lib/admin/api-auth";
import { getAdminActivities, hydrateActivitiesStore, seedActivities } from "@/lib/activity-store";
import { ACTIVITIES_SEED_COUNT } from "@/data/activities-seed";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    await hydrateActivitiesStore();
    return apiSuccess(getAdminActivities());
  } catch (err) {
    console.error("List activities error:", err);
    return apiError("Failed to list activities", 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    const { searchParams } = new URL(request.url);
    if (searchParams.get("action") !== "seed") {
      return apiError("Unsupported action", 400);
    }

    const saved = await seedActivities();
    return apiSuccess({
      message: `Seeded ${saved.length} activities`,
      count: saved.length,
      expected: ACTIVITIES_SEED_COUNT,
    });
  } catch (err) {
    console.error("Seed activities error:", err);
    return apiError("Failed to seed activities", 500);
  }
}
