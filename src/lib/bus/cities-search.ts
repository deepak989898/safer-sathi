import type { BusCityRecord } from "@/lib/seatseller/types";

/** Major hubs — matches SeatSeller sandbox sample routes and common searches. */
export const POPULAR_BUS_CITY_SEARCH_NAMES = [
  "bangalore",
  "bengaluru",
  "hyderabad",
  "chennai",
  "mumbai",
  "delhi",
  "new delhi",
  "pune",
  "mysore",
  "mysuru",
  "mangalore",
  "kolkata",
  "goa",
  "jaipur",
  "coimbatore",
  "visakhapatnam",
  "vijayawada",
  "ahmedabad",
] as const;

const POPULAR_SET = new Set<string>(POPULAR_BUS_CITY_SEARCH_NAMES);

const BLOCKED_NAME_FRAGMENTS = [
  "darshan",
  "sight",
  "sightseeing",
  "tour",
  "airport",
  "intl",
] as const;

export function isLikelyBusCity(name: string): boolean {
  const n = name.toLowerCase();
  return !BLOCKED_NAME_FRAGMENTS.some((word) => n.includes(word));
}

export function normalizeBusCity(city: BusCityRecord): BusCityRecord {
  return {
    ...city,
    searchName: city.searchName ?? city.name.toLowerCase().trim(),
  };
}

export function rankBusCities(cities: BusCityRecord[], query: string): BusCityRecord[] {
  const q = query.toLowerCase().trim();
  if (!q) return cities;

  const scored = cities.map((city) => {
    const searchName = city.searchName ?? city.name.toLowerCase().trim();
    const raw = city.name.toLowerCase();
    const popular = POPULAR_SET.has(searchName) || POPULAR_SET.has(raw);
    let score = 100;

    if (searchName === q || raw === q) score = 0;
    else if (searchName.startsWith(q) || raw.startsWith(q)) score = popular ? 10 : 20;
    else if (searchName.includes(q) || raw.includes(q)) score = popular ? 30 : 40;
    else score = 99;

    return { city, score, len: city.name.length };
  });

  return scored
    .filter((row) => row.score < 99)
    .sort(
      (a, b) =>
        a.score - b.score ||
        a.len - b.len ||
        a.city.name.localeCompare(b.city.name)
    )
    .map((row) => row.city);
}

export function dedupeBusCities(cities: BusCityRecord[]): BusCityRecord[] {
  const seen = new Map<string, BusCityRecord>();
  for (const city of cities) {
    const key = (city.searchName ?? city.name.toLowerCase()).trim();
    const existing = seen.get(key);
    if (!existing || city.name.length < existing.name.length) {
      seen.set(key, city);
    }
  }
  return [...seen.values()];
}

export function prepareBusCityResults(
  cities: BusCityRecord[],
  query: string,
  limit = 25
): BusCityRecord[] {
  const normalized = cities
    .filter((city) => Boolean(city.id && city.name))
    .map(normalizeBusCity)
    .filter((city) => isLikelyBusCity(city.name));

  const ranked = query.trim() ? rankBusCities(normalized, query) : normalized;
  return dedupeBusCities(ranked).slice(0, limit);
}
