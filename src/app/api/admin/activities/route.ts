import { z } from "zod";
import { actorRoleSchema, requireStaffRole } from "@/lib/admin/api-auth";
import { getAdminActivities, hydrateActivitiesStore, seedActivities } from "@/lib/activity-store";
import { ACTIVITIES_SEED_COUNT } from "@/data/activities-seed";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

export async function GET() {
  try {
    await hydrateActivitiesStore();
    return apiSuccess(getAdminActivities());
  } catch (err) {
    console.error("List activities error:", err);
    return apiError("Failed to list activities", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("action") !== "seed") {
      return apiError("Unsupported action", 400);
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;
    const parsed = z.object({ actorRole: actorRoleSchema }).safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }
    if (!requireStaffRole(parsed.data.actorRole)) {
      return apiError("Forbidden", 403);
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
