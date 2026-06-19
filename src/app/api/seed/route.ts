import { hydrateHotelsStore } from "@/lib/hotel-store";
import { hydratePackagesStore } from "@/lib/package-store";
import { hydrateVehiclesStore } from "@/lib/vehicle-store";
import { apiError, apiSuccess } from "@/lib/api-response";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return apiError("Seed endpoint is disabled in production", 403);
  }

  try {
    await Promise.all([
      hydratePackagesStore(),
      hydrateVehiclesStore(),
      hydrateHotelsStore(),
    ]);

    return apiSuccess({
      message: "Catalog hydrated from Firestore (seed data applied if collections were empty)",
    });
  } catch (err) {
    console.error("Seed error:", err);
    return apiError("Failed to seed catalog", 500);
  }
}
