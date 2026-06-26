"use server";

import { requireManagerAnalyticsRole } from "@/lib/admin/api-auth";
import { getAdminAnalytics } from "@/lib/analytics-service";
import { authenticateBearerToken } from "@/lib/auth/server-auth";

export type AdminAnalyticsActionResult =
  | { success: true; data: Awaited<ReturnType<typeof getAdminAnalytics>> }
  | { success: false; error: string };

/** Same-origin server action — avoids apex/www API redirect dropping auth headers. */
export async function loadAdminAnalyticsAction(
  idToken: string
): Promise<AdminAnalyticsActionResult> {
  try {
    const auth = await authenticateBearerToken(idToken);
    if ("error" in auth) {
      const body = (await auth.error.json()) as { error?: string };
      return { success: false, error: body.error ?? "Authentication failed" };
    }

    if (!requireManagerAnalyticsRole(auth.user.role)) {
      return {
        success: false,
        error: "Only Super Admin and Manager can access analytics",
      };
    }

    const data = await getAdminAnalytics(auth.user.role);
    return { success: true, data };
  } catch (error) {
    console.error("loadAdminAnalyticsAction error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load analytics";
    return { success: false, error: message };
  }
}
