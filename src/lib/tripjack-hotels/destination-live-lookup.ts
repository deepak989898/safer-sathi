import "server-only";

import { capHidsForListing } from "@/lib/tripjack-hotels/catalog-sync";
import {
  buildDestinationIndexFromHotels,
  upsertTripJackHotelCatalogEntries,
  upsertTripJackHotelDestinations,
} from "@/lib/tripjack-hotels/catalog-firestore";
import type {
  DestinationResolveResult,
  TripJackHotelCatalogEntry,
} from "@/lib/tripjack-hotels/catalog-types";
import { matchFallbackDestinationLabel } from "@/lib/tripjack-hotels/destination-fallback";
import {
  extractStaticHotelsPayload,
  normalizeStaticHotelRecord,
} from "@/lib/tripjack-hotels/normalize-static";
import { fetchTripJackStaticHotels } from "@/lib/tripjack-hotels/static-client";

const MAX_LIVE_PAGES = 6;

function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ");
}

function hotelMatchesQuery(hotel: TripJackHotelCatalogEntry, q: string): boolean {
  return (
    hotel.cityNameLower === q ||
    hotel.cityNameLower.startsWith(q) ||
    hotel.searchBlob.includes(q) ||
    hotel.nameLower.includes(q)
  );
}

/** Scan TripJack static catalog when Firestore index is empty or has no match. */
export async function resolveDestinationFromLiveCatalog(
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

  const fallbackLabel = matchFallbackDestinationLabel(q);
  const searchTerms = new Set([q]);
  if (fallbackLabel) searchTerms.add(fallbackLabel.toLowerCase());

  const matched: TripJackHotelCatalogEntry[] = [];
  let syncNext: string | null = null;

  try {
    for (let page = 0; page < MAX_LIVE_PAGES; page++) {
      const { data } = await fetchTripJackStaticHotels(syncNext);
      const { hotels, syncNext: next } = extractStaticHotelsPayload(data);

      for (const raw of hotels) {
        const entry = normalizeStaticHotelRecord(raw);
        if (!entry || entry.isDeleted) continue;
        if ([...searchTerms].some((term) => hotelMatchesQuery(entry, term))) {
          matched.push(entry);
        }
      }

      syncNext = next;
      if (!syncNext) break;
      if (matched.length >= 120) break;
    }
  } catch {
    return {
      query,
      matchType: "none",
      label: query,
      hids: [],
      totalMatched: 0,
      truncated: false,
    };
  }

  if (!matched.length) {
    return {
      query,
      matchType: "none",
      label: query,
      hids: [],
      totalMatched: 0,
      truncated: false,
    };
  }

  const cityGroups = new Map<string, TripJackHotelCatalogEntry[]>();
  for (const hotel of matched) {
    const key = hotel.cityNameLower || "unknown";
    const list = cityGroups.get(key) ?? [];
    list.push(hotel);
    cityGroups.set(key, list);
  }

  let bestKey = [...cityGroups.keys()][0];
  let bestScore = 99;
  for (const key of cityGroups.keys()) {
    let score = 99;
    if (key === q) score = 0;
    else if (key.startsWith(q)) score = 1;
    else if (key.includes(q)) score = 2;
    else if ([...searchTerms].some((term) => key.includes(term))) score = 3;
    if (score < bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  const bestHotels = cityGroups.get(bestKey) ?? matched;
  const hids = bestHotels.map((h) => h.tjHotelId);
  const capped = capHidsForListing(hids);
  const label = bestHotels[0]?.cityName || fallbackLabel || query;

  void upsertTripJackHotelCatalogEntries(bestHotels.slice(0, 200))
    .then(async () => {
      const destinations = buildDestinationIndexFromHotels(bestHotels);
      if (destinations.length) await upsertTripJackHotelDestinations(destinations);
    })
    .catch(() => undefined);

  return {
    query,
    matchType: "city",
    label,
    hids: capped.hids,
    totalMatched: hids.length,
    truncated: capped.truncated,
  };
}
