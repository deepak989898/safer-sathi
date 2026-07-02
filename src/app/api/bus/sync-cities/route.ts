import { requireStaffAuth } from "@/lib/admin/api-auth";
import {
  getBusCitiesFromDb,
  getBusCitiesLastSyncedAt,
  syncBusAliases,
  syncBusCities,
} from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { fetchAliases, fetchCities } from "@/lib/seatseller/client";
import { apiError, apiSuccess } from "@/lib/api-response";

/** SeatSeller + Firestore writes can take a while on first sync. */
export const maxDuration = 300;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    const force =
      new URL(request.url).searchParams.get("force") === "true" ||
      request.headers.get("x-bus-sync-force") === "true";

    if (!force) {
      const lastSynced = await getBusCitiesLastSyncedAt();
      if (lastSynced && Date.now() - new Date(lastSynced).getTime() < SEVEN_DAYS_MS) {
        const cities = await getBusCitiesFromDb();
        return apiSuccess({
          synced: false,
          message: "Cities synced within last 7 days",
          count: cities.length,
          lastSyncedAt: lastSynced,
        });
      }
    }

    const remote = await fetchCities();
    if (!remote.length) {
      return apiError("No cities returned from SeatSeller", 502);
    }

    const records = remote.map((c) => ({
      id: String(c.id),
      name: c.name,
      state: c.state,
      stateId: c.stateId ? String(c.stateId) : undefined,
      latitude:
        typeof c.latitude === "number" ? c.latitude : c.latitude ? Number(c.latitude) : undefined,
      longitude:
        typeof c.longitude === "number"
          ? c.longitude
          : c.longitude
            ? Number(c.longitude)
            : undefined,
      searchName: c.name.toLowerCase().trim(),
      updatedAt: new Date().toISOString(),
    }));

    const count = await syncBusCities(records);

    let aliasCount = 0;
    try {
      const aliases = await fetchAliases();
      aliasCount = await syncBusAliases(
        aliases.map((a) => ({
          id: String(a.id),
          cityName: a.cityName,
          aliasNames: a.aliasNames ?? [],
          syncedAt: new Date().toISOString(),
        }))
      );
    } catch (aliasError) {
      console.warn("Bus alias sync failed (cities saved):", aliasError);
    }
    return apiSuccess({
      synced: true,
      count,
      aliasCount,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return busApiError(error, "City sync failed");
  }
}
