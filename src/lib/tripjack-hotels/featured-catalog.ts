import "server-only";

import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";
import { catalogEntryImageUrls } from "@/lib/tripjack-hotels/hotel-images";
import { listFeaturedTripJackHotelsFromFirestore } from "@/lib/tripjack-hotels/catalog-firestore";

export interface FeaturedTripJackHotelCard {
  tjHotelId: number;
  name: string;
  cityName: string;
  location: string;
  heroImage?: string;
  imageUrls: string[];
  starRating: number | null;
  imageCaption?: string;
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

export async function getFeaturedTripJackHotels(limit = 24): Promise<FeaturedTripJackHotelCard[]> {
  const entries = await listFeaturedTripJackHotelsFromFirestore(limit * 3);
  const cards: FeaturedTripJackHotelCard[] = [];
  const seenCities = new Set<string>();

  for (const entry of entries) {
    const card = mapCatalogEntryToFeaturedCard(entry);
    if (!card || !card.imageUrls.length) continue;
    const cityKey = card.cityName.toLowerCase();
    if (cityKey && seenCities.has(cityKey) && cards.length >= limit) continue;
    if (cityKey) seenCities.add(cityKey);
    cards.push(card);
    if (cards.length >= limit) break;
  }

  return cards;
}
