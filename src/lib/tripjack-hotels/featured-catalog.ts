import "server-only";

import { listTripJackHotels } from "@/lib/tripjack-hotels/client";
import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";
import { searchTripJackHotelCatalogByCityPrefix } from "@/lib/tripjack-hotels/catalog-firestore";
import {
  DEFAULT_FEATURED_HOTEL_ROOMS,
  getDefaultHotelSearchDates,
} from "@/lib/tripjack-hotels/default-search-dates";
import { catalogEntryImageUrls } from "@/lib/tripjack-hotels/hotel-images";
import { generateHotelCorrelationId } from "@/lib/tripjack-hotels/correlation";
import { DEFAULT_HOTEL_CURRENCY, DEFAULT_HOTEL_NATIONALITY, isTripJackHotelProviderEnabled } from "@/lib/tripjack-hotels/config";

export const FEATURED_HOTEL_CITIES = [
  "Goa",
  "New Delhi",
  "Mumbai",
  "Jaipur",
  "Udaipur",
] as const;

export interface FeaturedTripJackHotelCard {
  tjHotelId: number;
  name: string;
  cityName: string;
  location: string;
  heroImage?: string;
  imageUrls: string[];
  starRating: number | null;
  imageCaption?: string;
  cheapestTotalPrice?: number;
  currency?: string;
  checkIn?: string;
  checkOut?: string;
}

export function mapCatalogEntryToFeaturedCard(
  entry: TripJackHotelCatalogEntry
): FeaturedTripJackHotelCard | null {
  const imageUrls = catalogEntryImageUrls(entry);
  if (entry.websiteVisible === false || entry.isDeleted) return null;

  return {
    tjHotelId: entry.tjHotelId,
    name: entry.name,
    cityName: entry.cityName,
    location: [entry.address, entry.cityName, entry.stateName].filter(Boolean).join(", "),
    heroImage: entry.heroImage ?? imageUrls[0],
    imageUrls,
    starRating: entry.starRating ?? entry.rating,
    imageCaption: entry.imageCaption,
  };
}

async function pickFeaturedFromCities(
  cities: readonly string[],
  perCity: number
): Promise<FeaturedTripJackHotelCard[]> {
  const cards: FeaturedTripJackHotelCard[] = [];
  const seen = new Set<number>();

  for (const city of cities) {
    const entries = await searchTripJackHotelCatalogByCityPrefix(city, perCity * 4);
    let addedForCity = 0;

    for (const entry of entries) {
      if (seen.has(entry.tjHotelId)) continue;
      const card = mapCatalogEntryToFeaturedCard(entry);
      if (!card || !card.imageUrls.length) continue;
      seen.add(entry.tjHotelId);
      cards.push(card);
      addedForCity += 1;
      if (addedForCity >= perCity) break;
    }
  }

  return cards;
}

async function attachLivePrices(cards: FeaturedTripJackHotelCard[]): Promise<FeaturedTripJackHotelCard[]> {
  if (!cards.length || !isTripJackHotelProviderEnabled()) return cards;

  const dates = getDefaultHotelSearchDates();
  const hids = cards.map((c) => c.tjHotelId);

  try {
    const listing = await listTripJackHotels({
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      rooms: [...DEFAULT_FEATURED_HOTEL_ROOMS],
      currency: DEFAULT_HOTEL_CURRENCY,
      nationality: DEFAULT_HOTEL_NATIONALITY,
      correlationId: generateHotelCorrelationId(),
      hids,
    });

    const priceMap = new Map(
      listing.hotels.map((hotel) => [Number(hotel.tjHotelId), hotel.cheapestTotalPrice])
    );

    return cards.map((card) => ({
      ...card,
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      currency: listing.currency || DEFAULT_HOTEL_CURRENCY,
      cheapestTotalPrice: priceMap.get(card.tjHotelId),
    }));
  } catch {
    return cards.map((card) => ({
      ...card,
      checkIn: dates.checkIn,
      checkOut: dates.checkOut,
      currency: DEFAULT_HOTEL_CURRENCY,
    }));
  }
}

export async function getFeaturedTripJackHotels(limit = 20): Promise<FeaturedTripJackHotelCard[]> {
  const perCity = Math.max(1, Math.ceil(limit / FEATURED_HOTEL_CITIES.length));
  const cards = await pickFeaturedFromCities(FEATURED_HOTEL_CITIES, perCity);
  const trimmed = cards.slice(0, limit);
  return attachLivePrices(trimmed);
}
