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

/** Exact hub names that SeatSeller uses for sample sandbox routes. */
const CANONICAL_HUB_NAMES = new Set([
  "bangalore",
  "bengaluru",
  "hyderabad",
  "chennai",
  "mumbai",
  "delhi",
  "pune",
  "mysore",
  "mysuru",
  "mangalore",
]);

function isCanonicalHub(city: BusCityRecord): boolean {
  const raw = city.name.toLowerCase().trim();
  const searchName = (city.searchName ?? raw).trim();
  return CANONICAL_HUB_NAMES.has(raw) || CANONICAL_HUB_NAMES.has(searchName);
}

function compareHubCities(a: BusCityRecord, b: BusCityRecord): number {
  const aHub = isCanonicalHub(a);
  const bHub = isCanonicalHub(b);
  if (aHub !== bHub) return aHub ? -1 : 1;
  const lenDiff = a.name.length - b.name.length;
  if (lenDiff !== 0) return lenDiff;
  const aId = Number(a.id);
  const bId = Number(b.id);
  if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) return aId - bId;
  return a.name.localeCompare(b.name);
}

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

    return { city, score, len: city.name.length, hub: isCanonicalHub(city) };
  });

  return scored
    .filter((row) => row.score < 99)
    .sort(
      (a, b) =>
        a.score - b.score ||
        (a.hub === b.hub ? 0 : a.hub ? -1 : 1) ||
        a.len - b.len ||
        compareHubCities(a.city, b.city)
    )
    .map((row) => row.city);
}

export function dedupeBusCities(cities: BusCityRecord[]): BusCityRecord[] {
  const seen = new Map<string, BusCityRecord>();
  for (const city of cities) {
    const key = (city.searchName ?? city.name.toLowerCase()).trim();
    const existing = seen.get(key);
    if (!existing || compareHubCities(city, existing) < 0) {
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

export function formatBusCityLabel(city: BusCityRecord): string {
  const state = city.state?.trim();
  return state ? `${city.name}, ${state}` : city.name;
}
