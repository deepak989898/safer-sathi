import "server-only";

import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";
import {
  getTripJackHotelCatalogEntryByHid,
  searchTripJackHotelCatalogByCityPrefix,
} from "@/lib/tripjack-hotels/catalog-firestore";
import { catalogEntryImageUrls } from "@/lib/tripjack-hotels/hotel-images";

export interface RelatedTripJackHotelCard {
  tjHotelId: number;
  name: string;
  cityName: string;
  location: string;
  heroImage?: string;
  imageUrls: string[];
  starRating: number | null;
  cheapestTotalPrice?: number;
  currency?: string;
}

function mapEntry(entry: TripJackHotelCatalogEntry): RelatedTripJackHotelCard | null {
  if (entry.isDeleted || entry.websiteVisible === false) return null;
  const imageUrls = catalogEntryImageUrls(entry);
  return {
    tjHotelId: entry.tjHotelId,
    name: entry.name,
    cityName: entry.cityName,
    location: [entry.address, entry.cityName, entry.stateName].filter(Boolean).join(", "),
    heroImage: entry.heroImage ?? imageUrls[0],
    imageUrls,
    starRating: entry.starRating ?? entry.rating,
  };
}

function starBucket(rating: number | null | undefined): number {
  if (!rating || rating <= 0) return 0;
  return Math.min(5, Math.round(rating));
}

export async function getRelatedTripJackCatalogHotels(input: {
  cityName?: string;
  starRating?: number | null;
  excludeHid: number;
  limit?: number;
}): Promise<RelatedTripJackHotelCard[]> {
  const limit = input.limit ?? 6;
  const exclude = Number(input.excludeHid);
  const targetStar = starBucket(input.starRating);
  const cards: RelatedTripJackHotelCard[] = [];
  const seen = new Set<number>();

  const pushEntry = (entry: TripJackHotelCatalogEntry) => {
    if (entry.tjHotelId === exclude || seen.has(entry.tjHotelId)) return;
    const card = mapEntry(entry);
    if (!card) return;
    seen.add(entry.tjHotelId);
    cards.push(card);
  };

  const city = (input.cityName ?? "").trim();
  if (city) {
    const byCity = await searchTripJackHotelCatalogByCityPrefix(city, 40);
    for (const entry of byCity) {
      pushEntry(entry);
      if (cards.length >= limit) return cards;
    }
  }

  if (targetStar > 0) {
    const byStarCity = await searchTripJackHotelCatalogByCityPrefix(
      city || String(targetStar),
      60
    );
    for (const entry of byStarCity) {
      if (starBucket(entry.starRating ?? entry.rating) !== targetStar) continue;
      pushEntry(entry);
      if (cards.length >= limit) return cards;
    }
  }

  if (cards.length < limit && city) {
    const current = await getTripJackHotelCatalogEntryByHid(exclude);
    const fallbackCity = current?.cityName ?? city;
    const wider = await searchTripJackHotelCatalogByCityPrefix(fallbackCity.slice(0, 3), 80);
    for (const entry of wider) {
      if (targetStar > 0 && starBucket(entry.starRating ?? entry.rating) !== targetStar) continue;
      pushEntry(entry);
      if (cards.length >= limit) break;
    }
  }

  return cards.slice(0, limit);
}
