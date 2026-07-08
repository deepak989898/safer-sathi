import "server-only";

import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";
import { resolveCatalogEntryImages } from "@/lib/tripjack-hotels/hotel-images";
import {
  getTripJackHotelCatalogEntriesByHids,
  searchTripJackHotelCatalogByCityPrefix,
  searchTripJackHotelCatalogByNamePrefix,
} from "@/lib/tripjack-hotels/catalog-firestore";
import { resolveDestinationToHids } from "@/lib/tripjack-hotels/destination-resolver";
import {
  hasFeaturedIndianCity,
  isIndiaTripJackCatalogHotel,
} from "@/lib/tripjack-hotels/india-catalog";
import { resolveHotelDisplayLocation } from "@/lib/tripjack-hotels/catalog-location";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";

function isMappingOnlyStub(entry: TripJackHotelCatalogEntry): boolean {
  const name = entry.name.trim();
  return /^hotel\s+\d+$/i.test(name) && !entry.cityName?.trim();
}

function isBrowsableCatalogEntry(entry: TripJackHotelCatalogEntry): boolean {
  if (entry.isDeleted || entry.websiteVisible === false) return false;
  if (!isIndiaTripJackCatalogHotel(entry)) return false;
  if (isMappingOnlyStub(entry)) return false;
  if (!entry.name?.trim()) return false;
  return true;
}

export function catalogEntryToBrowseHotel(entry: TripJackHotelCatalogEntry): NormalizedHotel {
  const images = resolveCatalogEntryImages(entry);
  const displayLocation = resolveHotelDisplayLocation(entry);

  return {
    tjHotelId: entry.tjHotelId,
    name: entry.name,
    starRating: entry.starRating ?? entry.rating,
    imageUrl: images.heroImage,
    imageUrls: images.imageUrls,
    heroImage: images.heroImage,
    imageCaption: images.imageCaption,
    images: images.rawImages.length ? images.rawImages : undefined,
    staticContent: images.rawImages.length ? { images: images.rawImages } : undefined,
    location: displayLocation,
    displayLocation,
    locality: entry.locality,
    hasBreakfast: false,
    cheapestTotalPrice: 0,
    cheapestBasePrice: 0,
    cheapestTaxes: 0,
    cheapestMf: 0,
    cheapestMft: 0,
    currency: "INR",
    mealBasis: "",
    inclusions: entry.facilities?.slice(0, 3) ?? [],
    isRefundable: false,
    panRequired: false,
    passportRequired: false,
    options: [],
    cheapestOption: null,
    browseOnly: true,
  };
}

export interface CatalogBrowseResult {
  destinationLabel: string;
  hotels: NormalizedHotel[];
  totalResults: number;
  truncated: boolean;
}

export async function searchCatalogBrowseHotels(input: {
  destination?: string;
  hids?: number[];
  limit?: number;
}): Promise<CatalogBrowseResult> {
  const limit = Math.min(120, Math.max(1, input.limit ?? 100));
  const destination = input.destination?.trim() ?? "";
  let label = destination;
  let hids: number[] = [...(input.hids ?? [])];
  let truncated = false;

  if (!hids.length && destination.length >= 2) {
    const resolved = await resolveDestinationToHids(destination);
    hids = resolved.hids;
    label = resolved.label || destination;
    truncated = resolved.truncated;
  }

  const entries: TripJackHotelCatalogEntry[] = [];

  if (hids.length) {
    entries.push(...(await getTripJackHotelCatalogEntriesByHids(hids, { browse: true })));
  } else if (destination.length >= 2) {
    const [byCity, byName] = await Promise.all([
      searchTripJackHotelCatalogByCityPrefix(destination, limit),
      searchTripJackHotelCatalogByNamePrefix(destination, Math.min(limit, 40)),
    ]);
    const seen = new Set<number>();
    for (const entry of [...byCity, ...byName]) {
      if (seen.has(entry.tjHotelId)) continue;
      seen.add(entry.tjHotelId);
      entries.push(entry);
    }
    if (!label && entries[0]?.cityName) {
      label = entries[0].cityName;
    }
  }

  const hotels = entries
    .filter(isBrowsableCatalogEntry)
    .filter((entry) => entry.contentSynced || hasFeaturedIndianCity(entry))
    .map(catalogEntryToBrowseHotel)
    .slice(0, limit);

  return {
    destinationLabel: label || destination || "Hotels",
    hotels,
    totalResults: hotels.length,
    truncated,
  };
}
