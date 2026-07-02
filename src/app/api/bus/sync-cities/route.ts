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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    const force =
      new URL(request.url).searchParams.get("force") === "true" ||
      request.headers.get("x-bus-sync-force") === "true";

    const lastSynced = await getBusCitiesLastSyncedAt();
    if (!force && lastSynced && Date.now() - new Date(lastSynced).getTime() < SEVEN_DAYS_MS) {
      const cities = await getBusCitiesFromDb();
      return apiSuccess({
        synced: false,
        message: "Cities synced within last 7 days",
        count: cities.length,
        lastSyncedAt: lastSynced,
      });
    }

    const [remote, aliases] = await Promise.all([fetchCities(), fetchAliases()]);
    if (!remote.length) {
      return apiError("No cities returned from SeatSeller", 502);
    }

    const records = remote.map((c) => ({
      id: String(c.id),
      name: c.name,
      state: c.state,
      syncedAt: new Date().toISOString(),
    }));

    const count = await syncBusCities(records);
    const aliasCount = await syncBusAliases(
      aliases.map((a) => ({
        id: String(a.id),
        cityName: a.cityName,
        aliasNames: a.aliasNames ?? [],
        syncedAt: new Date().toISOString(),
      }))
    );
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
