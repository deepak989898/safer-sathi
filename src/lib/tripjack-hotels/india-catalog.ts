import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";

const INDIA_COUNTRY_PATTERN = /\b(india|ind|bharat)\b/i;

export function isIndiaTripJackCatalogHotel(
  entry: Pick<TripJackHotelCatalogEntry, "countryName" | "countryCode">
): boolean {
  const countryCode = (entry.countryCode ?? "").trim().toUpperCase();
  if (countryCode === "IN") return true;

  const countryName = (entry.countryName ?? "").trim();
  if (countryName && INDIA_COUNTRY_PATTERN.test(countryName)) return true;

  // Mapping-only / legacy India catalog rows often omit country fields.
  if (!countryName && !countryCode) return true;

  return false;
}

/** Best display city for India hotels — falls back to region/state when cityName is missing. */
export function resolveIndianDisplayCity(entry: TripJackHotelCatalogEntry): string | null {
  const city = entry.cityName?.trim() ?? "";
  if (city && !INDIA_COUNTRY_PATTERN.test(city)) return city;

  const region = entry.region?.trim() ?? "";
  if (region && !INDIA_COUNTRY_PATTERN.test(region)) return region;

  const state = entry.stateName?.trim() ?? "";
  if (state && !INDIA_COUNTRY_PATTERN.test(state)) return state;

  return null;
}

export function hasFeaturedIndianCity(entry: TripJackHotelCatalogEntry): boolean {
  return resolveIndianDisplayCity(entry) != null;
}
