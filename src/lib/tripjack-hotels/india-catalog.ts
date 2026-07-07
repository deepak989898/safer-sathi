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

export function hasFeaturedIndianCity(entry: TripJackHotelCatalogEntry): boolean {
  const city = entry.cityName?.trim().toLowerCase() ?? "";
  if (!city) return false;
  if (INDIA_COUNTRY_PATTERN.test(city)) return false;
  return true;
}
