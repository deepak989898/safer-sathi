import { getBusCitiesFromDb } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { fetchCities } from "@/lib/seatseller/client";
import { apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    let cities = await getBusCitiesFromDb();
    if (!cities.length) {
      const remote = await fetchCities();
      cities = remote.map((c) => ({
        id: String(c.id),
        name: c.name,
        state: c.state,
        syncedAt: new Date().toISOString(),
      }));
    }
    return apiSuccess({ cities, count: cities.length });
  } catch (error) {
    return busApiError(error, "Failed to load cities");
  }
}
