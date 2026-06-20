import { parseSuperAdminRole } from "@/lib/ai-center/api-auth";
import {
  buildAnalyticsSnapshot,
  hydrateAiAnalyticsStore,
  listAnalyticsSnapshots,
  listPhase2Logs,
} from "@/lib/ai-center/analytics-service";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleCheck = parseSuperAdminRole(searchParams.get("actorRole"));
    if (roleCheck.error) return roleCheck.error;

    await hydrateAiAnalyticsStore();

    const dateFrom = searchParams.get("dateFrom") ?? undefined;
    const dateTo = searchParams.get("dateTo") ?? undefined;
    const refresh = searchParams.get("refresh") === "true";

    const snapshot = refresh
      ? await buildAnalyticsSnapshot(dateFrom, dateTo)
      : listAnalyticsSnapshots()[0] ?? (await buildAnalyticsSnapshot(dateFrom, dateTo));

    return apiSuccess({
      snapshot,
      history: listAnalyticsSnapshots().slice(0, 10),
      logs: listPhase2Logs(50),
    });
  } catch (err) {
    console.error("AI analytics error:", err);
    return apiError("Failed to load analytics", 500);
  }
}
