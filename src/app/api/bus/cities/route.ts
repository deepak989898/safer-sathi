import { getBusAliasesFromDb, getBusCitiesFromDb } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { fetchAliases, fetchCities } from "@/lib/seatseller/client";
import { apiSuccess } from "@/lib/api-response";
import type { BusCityRecord } from "@/lib/seatseller/types";

function normalizeCityLabel(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET() {
  try {
    let cities = await getBusCitiesFromDb();
    let aliases = await getBusAliasesFromDb();
    if (!cities.length) {
      const [remote, remoteAliases] = await Promise.all([fetchCities(), fetchAliases()]);
      cities = remote.map((c) => ({
        id: String(c.id),
        name: c.name,
        state: c.state,
        syncedAt: new Date().toISOString(),
      }));
      aliases = remoteAliases.map((a) => ({
        id: String(a.id),
        cityName: a.cityName,
        aliasNames: a.aliasNames ?? [],
        syncedAt: new Date().toISOString(),
      }));
    }

    // Build canonical city names from aliases when available to avoid noisy duplicates
    // such as "Pune Darshan", "Shivri (Pune)", etc. in search dropdowns.
    let canonical: BusCityRecord[] = cities;
    if (aliases.length) {
      const byId = new Map(cities.map((c) => [String(c.id), c]));
      canonical = aliases.map((a) => {
        const city = byId.get(String(a.id));
        return {
          id: String(a.id),
          name: a.cityName?.trim() || city?.name || String(a.id),
          state: city?.state,
          syncedAt: city?.syncedAt ?? a.syncedAt,
        };
      });
    }

    // Final dedupe by normalized city label.
    const deduped = new Map<string, BusCityRecord>();
    for (const city of canonical) {
      const key = normalizeCityLabel(city.name);
      if (!key) continue;
      if (!deduped.has(key)) deduped.set(key, city);
    }

    const finalCities = [...deduped.values()].sort((a, b) => a.name.localeCompare(b.name));
    return apiSuccess({ cities: finalCities, count: finalCities.length });
  } catch (error) {
    return busApiError(error, "Failed to load cities");
  }
}
