import {
  capHidsForListing,
} from "@/lib/tripjack-hotels/catalog-sync";
import {
  findTripJackHotelsBySearchBlob,
  getTripJackDestinationBySearchKey,
  searchTripJackHotelCatalogByCityPrefix,
  searchTripJackHotelCatalogByNamePrefix,
  searchTripJackHotelDestinations,
} from "@/lib/tripjack-hotels/catalog-firestore";
import {
  MAX_LISTING_HIDS,
  type DestinationResolveResult,
  type DestinationSuggestion,
} from "@/lib/tripjack-hotels/catalog-types";
import { suggestFallbackDestinations } from "@/lib/tripjack-hotels/destination-fallback";
import { resolveDestinationFromLiveCatalog } from "@/lib/tripjack-hotels/destination-live-lookup";
import {
  getTripJackHotelManualDestinationByQuery,
  listTripJackHotelManualDestinations,
  manualDestinationToSuggestion,
} from "@/lib/tripjack-hotels/manual-destinations";

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

function rankSuggestion(
  label: string,
  searchKey: string,
  query: string
): number {
  const q = normalizeQuery(query);
  const key = searchKey.toLowerCase();
  const lbl = label.toLowerCase();
  if (key === q || lbl === q) return 0;
  if (key.startsWith(q) || lbl.startsWith(q)) return 1;
  if (key.includes(q) || lbl.includes(q)) return 2;
  return 99;
}

export async function suggestHotelDestinations(
  query: string,
  limit = 12
): Promise<DestinationSuggestion[]> {
  const q = normalizeQuery(query);
  if (!q) return [];

  const [destinations, hotelsByCity, hotelsByName, hotelsByBlob, manualDestinations] =
    await Promise.all([
      searchTripJackHotelDestinations(q, 20),
      searchTripJackHotelCatalogByCityPrefix(q, 15),
      searchTripJackHotelCatalogByNamePrefix(q, 10),
      q.length >= 3 ? findTripJackHotelsBySearchBlob(q, 20) : Promise.resolve([]),
      listTripJackHotelManualDestinations(),
    ]);

  const hotelCandidates = [...hotelsByCity];
  for (const hotel of hotelsByName) {
    if (!hotelCandidates.some((h) => h.tjHotelId === hotel.tjHotelId)) {
      hotelCandidates.push(hotel);
    }
  }

  const suggestions: DestinationSuggestion[] = [];

  for (const dest of manualDestinations) {
    const rank = rankSuggestion(dest.label, dest.searchKey, q);
    const aliasRank = dest.searchKeys.some((key) => rankSuggestion(dest.label, key, q) <= 2)
      ? 1
      : 99;
    if (rank <= 2 || aliasRank <= 2) {
      suggestions.push(manualDestinationToSuggestion(dest));
    }
  }

  for (const dest of destinations) {
    if (dest.type === "hotel") continue;
    suggestions.push({
      id: dest.id,
      type: dest.type,
      label: dest.label,
      subtitle:
        dest.type === "city"
          ? `${dest.countryName || "India"} · ${dest.hotelCount} hotel${dest.hotelCount === 1 ? "" : "s"}`
          : `${dest.hotelCount} hotel${dest.hotelCount === 1 ? "" : "s"}`,
      hotelCount: dest.hotelCount,
      hids: dest.hids.slice(0, MAX_LISTING_HIDS),
    });
  }

  const cityGroups = new Map<string, { label: string; hids: number[]; countryName: string }>();
  for (const hotel of hotelsByCity) {
    if (!hotel.cityName) continue;
    const key = hotel.cityNameLower || hotel.cityName.toLowerCase();
    const existing = cityGroups.get(key);
    if (existing) {
      existing.hids.push(hotel.tjHotelId);
    } else {
      cityGroups.set(key, {
        label: hotel.cityName,
        hids: [hotel.tjHotelId],
        countryName: hotel.countryName,
      });
    }
  }

  for (const [key, group] of cityGroups) {
    if (suggestions.some((s) => s.type === "city" && s.label.toLowerCase() === key)) continue;
    suggestions.push({
      id: `city_catalog_${key}`,
      type: "city",
      label: group.label,
      subtitle: `${group.countryName || "India"} · ${group.hids.length} hotel${group.hids.length === 1 ? "" : "s"}`,
      hotelCount: group.hids.length,
      hids: group.hids.slice(0, MAX_LISTING_HIDS),
    });
  }

  for (const hotel of hotelsByBlob) {
    if (!hotelCandidates.some((h) => h.tjHotelId === hotel.tjHotelId)) {
      hotelCandidates.push(hotel);
    }
  }

  for (const hotel of hotelCandidates.slice(0, 8)) {
    const ratingPart = hotel.rating ? ` · ${hotel.rating}★` : "";
    const typePart = hotel.propertyType ? ` · ${hotel.propertyType}` : "";
    suggestions.push({
      id: hotel.id,
      type: "hotel",
      label: hotel.name,
      subtitle: `${[hotel.cityName, hotel.countryName].filter(Boolean).join(", ") || "Hotel"} — Hotel${ratingPart}${typePart}`,
      hotelCount: 1,
      hids: [hotel.tjHotelId],
    });
  }

  return suggestions
    .map((item) => ({
      item,
      rank: rankSuggestion(item.label, item.label, q),
    }))
    .filter((row) => row.rank <= 2)
    .sort((a, b) => a.rank - b.rank || b.item.hotelCount - a.item.hotelCount)
    .map((row) => row.item)
    .slice(0, limit);
}

function mergeSuggestions(
  primary: DestinationSuggestion[],
  fallback: DestinationSuggestion[],
  limit: number
): DestinationSuggestion[] {
  const merged = [...primary];
  for (const item of fallback) {
    if (merged.some((existing) => existing.label.toLowerCase() === item.label.toLowerCase())) {
      continue;
    }
    merged.push(item);
  }
  return merged.slice(0, limit);
}

export async function suggestHotelDestinationsWithFallback(
  query: string,
  limit = 12
): Promise<DestinationSuggestion[]> {
  const q = normalizeQuery(query);
  if (!q) {
    return suggestFallbackDestinations("", limit);
  }

  const catalogSuggestions = await suggestHotelDestinations(q, limit);
  if (catalogSuggestions.length >= limit) return catalogSuggestions;

  const fallback = suggestFallbackDestinations(q, limit);
  return mergeSuggestions(catalogSuggestions, fallback, limit);
}

export async function resolveDestinationToHids(
  destination: string
): Promise<DestinationResolveResult> {
  const query = destination.trim();
  const q = normalizeQuery(query);

  if (!q) {
    return {
      query,
      matchType: "none",
      label: query,
      hids: [],
      totalMatched: 0,
      truncated: false,
    };
  }

  const exactDest = await getTripJackDestinationBySearchKey(q);
  if (exactDest && exactDest.hids.length) {
    const capped = capHidsForListing(exactDest.hids);
    return {
      query,
      matchType: exactDest.type === "country" ? "country" : "city",
      label: exactDest.label,
      hids: capped.hids,
      totalMatched: exactDest.hids.length,
      truncated: capped.truncated,
    };
  }

  const manualDest = await getTripJackHotelManualDestinationByQuery(query);
  if (manualDest?.hids.length) {
    const capped = capHidsForListing(manualDest.hids);
    return {
      query,
      matchType: "city",
      label: manualDest.label,
      hids: capped.hids,
      totalMatched: manualDest.hids.length,
      truncated: capped.truncated,
    };
  }

  const partialDestinations = await searchTripJackHotelDestinations(q, 10);
  const bestDest = partialDestinations
    .filter((d) => d.type !== "hotel")
    .sort(
      (a, b) =>
        rankSuggestion(a.label, a.searchKey, q) - rankSuggestion(b.label, b.searchKey, q) ||
        b.hotelCount - a.hotelCount
    )[0];

  if (bestDest && rankSuggestion(bestDest.label, bestDest.searchKey, q) <= 2) {
    const capped = capHidsForListing(bestDest.hids);
    return {
      query,
      matchType: bestDest.type === "country" ? "country" : "city",
      label: bestDest.label,
      hids: capped.hids,
      totalMatched: bestDest.hids.length,
      truncated: capped.truncated,
    };
  }

  const hotelsByCity = await searchTripJackHotelCatalogByCityPrefix(q, 120);
  if (hotelsByCity.length) {
    const cityLabel = hotelsByCity[0].cityName || query;
    const capped = capHidsForListing(hotelsByCity.map((h) => h.tjHotelId));
    return {
      query,
      matchType: "city",
      label: cityLabel,
      hids: capped.hids,
      totalMatched: hotelsByCity.length,
      truncated: capped.truncated,
    };
  }

  const hotelsByName = await searchTripJackHotelCatalogByNamePrefix(q, 30);
  const hotelsByBlob = await findTripJackHotelsBySearchBlob(q, 80);

  const mergedHotels = [...hotelsByName];
  for (const hotel of hotelsByBlob) {
    if (!mergedHotels.some((h) => h.tjHotelId === hotel.tjHotelId)) {
      mergedHotels.push(hotel);
    }
  }

  const nameMatches = mergedHotels.filter((hotel) => {
    const blob = hotel.searchBlob;
    return (
      hotel.nameLower.includes(q) ||
      hotel.cityNameLower.includes(q) ||
      blob.includes(q)
    );
  });

  if (nameMatches.length === 1) {
    return {
      query,
      matchType: "hotel",
      label: nameMatches[0].name,
      hids: [nameMatches[0].tjHotelId],
      totalMatched: 1,
      truncated: false,
    };
  }

  if (nameMatches.length > 1) {
    const cityGroups = new Map<string, number[]>();
    for (const hotel of nameMatches) {
      const key = hotel.cityNameLower || "unknown";
      const list = cityGroups.get(key) ?? [];
      list.push(hotel.tjHotelId);
      cityGroups.set(key, list);
    }

    if (cityGroups.size === 1) {
      const [[, ids]] = [...cityGroups.entries()];
      const capped = capHidsForListing(ids);
      const label = nameMatches[0].cityName || query;
      return {
        query,
        matchType: "city",
        label,
        hids: capped.hids,
        totalMatched: ids.length,
        truncated: capped.truncated,
      };
    }

    const capped = capHidsForListing(nameMatches.map((h) => h.tjHotelId));
    return {
      query,
      matchType: "mixed",
      label: query,
      hids: capped.hids,
      totalMatched: nameMatches.length,
      truncated: capped.truncated,
    };
  }

  const liveResult = await resolveDestinationFromLiveCatalog(query);
  if (liveResult.hids.length) {
    return liveResult;
  }

  return {
    query,
    matchType: "none",
    label: query,
    hids: [],
    totalMatched: 0,
    truncated: false,
  };
}
