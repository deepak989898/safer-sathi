import { resetDemoBookings } from "@/lib/data-service";
import { resetDemoAuditLogs } from "@/lib/automation/audit-log";
import {
  demoAnalytics,
  demoBookings,
  demoPackages,
  demoUsers,
  demoVehicles,
} from "@/data/demo-data";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return apiError("Seed endpoint is disabled in production", 403);
  }

  try {
    const { searchParams } = new URL(request.url);
    const reset = searchParams.get("reset") !== "false";

    if (reset) {
      resetDemoBookings();
      resetDemoAuditLogs();
    }

    return apiSuccess({
      message: "Demo data seeded successfully",
      counts: {
        vehicles: demoVehicles.length,
        packages: demoPackages.length,
        bookings: demoBookings.length,
        users: demoUsers.length,
      },
      analytics: demoAnalytics,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return apiError("Failed to seed demo data", 500);
  }
}
