import "server-only";

import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";
import { catalogEntryImageUrls } from "@/lib/tripjack-hotels/hotel-images";
import {
  searchTripJackHotelCatalogByCityPrefix,
} from "@/lib/tripjack-hotels/catalog-firestore";

import { POPULAR_FEATURED_CITIES } from "@/lib/tripjack-hotels/popular-cities";

export interface FeaturedTripJackHotelCard {
  tjHotelId: number;
  name: string;
  cityName: string;
  location: string;
  heroImage?: string;
  imageUrls: string[];
  starRating: number | null;
  imageCaption?: string;
  amenities: string[];
}

function cityMatches(entry: TripJackHotelCatalogEntry, city: string): boolean {
  const needle = city.toLowerCase();
  return (
    entry.cityNameLower.includes(needle) ||
    entry.cityName.toLowerCase().includes(needle) ||
    entry.searchBlob.includes(needle)
  );
}

export function mapCatalogEntryToFeaturedCard(
  entry: TripJackHotelCatalogEntry
): FeaturedTripJackHotelCard | null {
  const imageUrls = catalogEntryImageUrls(entry);
  if (entry.websiteVisible === false || entry.isDeleted) return null;
  if (!entry.contentSynced) return null;

  return {
    tjHotelId: entry.tjHotelId,
    name: entry.name,
    cityName: entry.cityName,
    location: [entry.address, entry.cityName, entry.stateName].filter(Boolean).join(", "),
    heroImage: entry.heroImage ?? imageUrls[0],
    imageUrls,
    starRating: entry.starRating ?? entry.rating,
    imageCaption: entry.imageCaption,
    amenities: (entry.facilities ?? []).slice(0, 4),
  };
}

export async function getFeaturedTripJackHotels(limit = 20): Promise<FeaturedTripJackHotelCard[]> {
  const cards: FeaturedTripJackHotelCard[] = [];
  const usedIds = new Set<number>();
  const perCity = Math.max(2, Math.ceil(limit / POPULAR_FEATURED_CITIES.length));

  for (const city of POPULAR_FEATURED_CITIES) {
    if (cards.length >= limit) break;

    const entries = await searchTripJackHotelCatalogByCityPrefix(city, perCity * 4);
    let cityCount = 0;

    for (const entry of entries) {
      if (cards.length >= limit || cityCount >= perCity) break;
      if (!cityMatches(entry, city)) continue;

      const card = mapCatalogEntryToFeaturedCard(entry);
      if (!card || !card.imageUrls.length || usedIds.has(card.tjHotelId)) continue;

      usedIds.add(card.tjHotelId);
      cards.push(card);
      cityCount += 1;
    }
  }

  if (cards.length < limit) {
    for (const city of POPULAR_FEATURED_CITIES) {
      if (cards.length >= limit) break;
      const entries = await searchTripJackHotelCatalogByCityPrefix(city, 12);
      for (const entry of entries) {
        if (cards.length >= limit) break;
        const card = mapCatalogEntryToFeaturedCard(entry);
        if (!card || !card.imageUrls.length || usedIds.has(card.tjHotelId)) continue;
        usedIds.add(card.tjHotelId);
        cards.push(card);
      }
    }
  }

  return cards.slice(0, limit);
}

export async function getRelatedTripJackHotels(
  cityName: string,
  excludeHid: number,
  starRating: number | null,
  limit = 6
): Promise<FeaturedTripJackHotelCard[]> {
  const entries = await searchTripJackHotelCatalogByCityPrefix(cityName, limit * 4);
  const sameCity: FeaturedTripJackHotelCard[] = [];
  const sameStar: FeaturedTripJackHotelCard[] = [];
  const fallback: FeaturedTripJackHotelCard[] = [];

  for (const entry of entries) {
    if (entry.tjHotelId === excludeHid) continue;
    const card = mapCatalogEntryToFeaturedCard(entry);
    if (!card || !card.imageUrls.length) continue;

    if (cityMatches(entry, cityName)) {
      sameCity.push(card);
    } else if (
      starRating != null &&
      card.starRating != null &&
      Math.round(card.starRating) === Math.round(starRating)
    ) {
      sameStar.push(card);
    } else {
      fallback.push(card);
    }
  }

  const merged = [...sameCity, ...sameStar, ...fallback];
  const unique: FeaturedTripJackHotelCard[] = [];
  const seen = new Set<number>();
  for (const card of merged) {
    if (seen.has(card.tjHotelId)) continue;
    seen.add(card.tjHotelId);
    unique.push(card);
    if (unique.length >= limit) break;
  }

  return unique;
}
