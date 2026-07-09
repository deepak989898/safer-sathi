import "server-only";

import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";
import type { FeaturedTripJackHotelCard } from "@/lib/tripjack-hotels/featured-catalog-types";
import { catalogEntryImageUrls } from "@/lib/tripjack-hotels/hotel-images";
import {
  enrichCatalogEntryLocation,
  FEATURED_POPULAR_CITIES,
  formatFeaturedCardLocation,
  popularCityDisplayName,
  resolveHotelDisplayLocation,
  resolvePopularCityKey,
} from "@/lib/tripjack-hotels/catalog-location";
import {
  listBrowsableIndiaHotelsPage,
  listFeaturedTripJackHotelsFromFirestore,
  getTripJackHotelCityFilterStats,
} from "@/lib/tripjack-hotels/catalog-firestore";
import { isIndiaTripJackCatalogHotel } from "@/lib/tripjack-hotels/india-catalog";

export type { FeaturedTripJackHotelCard } from "@/lib/tripjack-hotels/featured-catalog-types";

const PRIORITY_CITY_KEYS = FEATURED_POPULAR_CITIES.map((city) => city.toLowerCase());

function isMappingOnlyStub(entry: TripJackHotelCatalogEntry): boolean {
  const name = entry.name.trim();
  return /^hotel\s+\d+$/i.test(name) && !entry.cityName?.trim();
}

function cardScore(card: FeaturedTripJackHotelCard): number {
  let score = 0;
  if (card.imageUrls.length > 0) score += 60;
  if (card.heroImage) score += 20;
  if (card.locality) score += 15;
  if (card.starRating && card.starRating > 0) score += 10;
  if (card.facilities.length > 0) score += 5;
  if (PRIORITY_CITY_KEYS.includes(card.cityKey)) score += 25;
  return score;
}

export function mapCatalogEntryToFeaturedCard(
  entry: TripJackHotelCatalogEntry
): FeaturedTripJackHotelCard | null {
  return mapCatalogEntryToListCard(entry, { requireImage: true });
}

/** Browse / city-filter card — same shape as featured, allows placeholder image. */
export function mapCatalogEntryToListCard(
  entry: TripJackHotelCatalogEntry,
  options?: { requireImage?: boolean }
): FeaturedTripJackHotelCard | null {
  if (entry.websiteVisible === false || entry.isDeleted || !entry.contentSynced) return null;
  if (!entry.name?.trim() || isMappingOnlyStub(entry)) return null;
  if (!isIndiaTripJackCatalogHotel(entry)) return null;

  const enriched = enrichCatalogEntryLocation(entry);
  const resolved = formatFeaturedCardLocation(enriched);
  if (!resolved) return null;

  const imageUrls = catalogEntryImageUrls(enriched);
  if (options?.requireImage && !imageUrls.length && !enriched.heroImage) return null;

  const displayLocation = resolveHotelDisplayLocation(enriched);

  return {
    tjHotelId: enriched.tjHotelId,
    name: enriched.name,
    cityName: resolved.cityName,
    cityKey: resolved.cityKey,
    locality: resolved.locality,
    location: displayLocation,
    heroImage: enriched.heroImage ?? imageUrls[0],
    imageUrls,
    starRating: enriched.starRating ?? enriched.rating,
    imageCaption: enriched.imageCaption,
    facilities: (enriched.facilities ?? []).slice(0, 6),
  };
}

export interface FeaturedCityHotelsPageResult {
  hotels: FeaturedTripJackHotelCard[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  cityKey: string;
  cityName: string;
}

export async function getFeaturedCityHotelsPaged(input: {
  cityKey: string;
  page?: number;
  pageSize?: number;
}): Promise<FeaturedCityHotelsPageResult> {
  const cityKey = resolvePopularCityKey(input.cityKey) ?? input.cityKey.toLowerCase().trim();
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));

  const browse = await listBrowsableIndiaHotelsPage({
    page,
    pageSize,
    city: cityKey,
  });

  const filterStats = await getTripJackHotelCityFilterStats();
  const catalogCityCount = filterStats.cities.find((item) => item.key === cityKey)?.count;
  const totalCount = catalogCityCount ?? browse.totalCount;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const hotels = browse.entries
    .map((entry) => mapCatalogEntryToListCard(entry))
    .filter((card): card is FeaturedTripJackHotelCard => Boolean(card));

  const cityLabel =
    FEATURED_POPULAR_CITIES.find(
      (city) => (resolvePopularCityKey(city) ?? city.toLowerCase()) === cityKey
    ) ?? popularCityDisplayName(cityKey);

  return {
    hotels,
    page: browse.page,
    pageSize: browse.pageSize,
    totalCount,
    totalPages,
    cityKey,
    cityName: cityLabel,
  };
}

export async function getFeaturedTripJackHotels(limit = 24): Promise<FeaturedTripJackHotelCard[]> {
  const target = Math.min(30, Math.max(20, limit));
  const pickLimit = Math.max(target * 8, 200);

  let entries = await listFeaturedTripJackHotelsFromFirestore(pickLimit);

  if (entries.length < target) {
    const browsePage = await listBrowsableIndiaHotelsPage({ page: 1, pageSize: pickLimit });
    const seen = new Set(entries.map((entry) => entry.tjHotelId));
    for (const entry of browsePage.entries) {
      if (seen.has(entry.tjHotelId)) continue;
      if (!entry.contentSynced) continue;
      seen.add(entry.tjHotelId);
      entries.push(entry);
      if (entries.length >= pickLimit) break;
    }
  }

  const cardsByCity = new Map<string, FeaturedTripJackHotelCard[]>();
  const fallback: FeaturedTripJackHotelCard[] = [];

  for (const entry of entries) {
    const card = mapCatalogEntryToFeaturedCard(entry);
    if (!card) continue;
    const cityKey = card.cityKey || card.cityName.toLowerCase();
    if (PRIORITY_CITY_KEYS.includes(cityKey)) {
      const list = cardsByCity.get(cityKey) ?? [];
      list.push(card);
      cardsByCity.set(cityKey, list);
    } else {
      fallback.push(card);
    }
  }

  for (const [city, hotels] of cardsByCity.entries()) {
    hotels.sort((a, b) => cardScore(b) - cardScore(a));
    cardsByCity.set(city, hotels);
  }
  fallback.sort((a, b) => cardScore(b) - cardScore(a));

  const selected: FeaturedTripJackHotelCard[] = [];
  const selectedIds = new Set<number>();
  const maxPerCity = 3;

  const addCard = (card: FeaturedTripJackHotelCard) => {
    if (selected.length >= target || selectedIds.has(card.tjHotelId)) return;
    selectedIds.add(card.tjHotelId);
    selected.push(card);
  };

  for (const cityLabel of FEATURED_POPULAR_CITIES) {
    const cityKey = resolvePopularCityKey(cityLabel) ?? cityLabel.toLowerCase();
    const cityHotels = cardsByCity.get(cityKey) ?? [];
    for (const hotel of cityHotels.slice(0, maxPerCity)) {
      addCard(hotel);
      if (selected.length >= target) break;
    }
    if (selected.length >= target) break;
  }

  if (selected.length < target) {
    const otherCities = [...cardsByCity.entries()]
      .filter(([city]) => !PRIORITY_CITY_KEYS.includes(city))
      .sort((a, b) => b[1].length - a[1].length);

    for (const [, cityHotels] of otherCities) {
      for (const hotel of cityHotels.slice(0, maxPerCity)) {
        addCard(hotel);
        if (selected.length >= target) break;
      }
      if (selected.length >= target) break;
    }
  }

  if (selected.length < target) {
    for (const hotel of fallback) {
      addCard(hotel);
      if (selected.length >= target) break;
    }
  }

  return selected
    .sort((a, b) => cardScore(b) - cardScore(a))
    .slice(0, target);
}
