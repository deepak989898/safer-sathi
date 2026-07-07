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

const PRIORITY_CITIES = [
  "mumbai",
  "delhi",
  "goa",
  "jaipur",
  "bengaluru",
  "bangalore",
  "hyderabad",
  "chennai",
  "kolkata",
  "pune",
];

function normalizeCity(city: string): string {
  return city.trim().toLowerCase();
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
  const cardsByCity = new Map<string, FeaturedTripJackHotelCard[]>();
  const fallback: FeaturedTripJackHotelCard[] = [];

  for (const entry of entries) {
    const card = mapCatalogEntryToFeaturedCard(entry);
    if (!card || !card.imageUrls.length) continue;
    const city = normalizeCity(card.cityName || "");
    if (!city) {
      fallback.push(card);
      continue;
    }
    const list = cardsByCity.get(city) ?? [];
    list.push(card);
    cardsByCity.set(city, list);
  }

  const selected: FeaturedTripJackHotelCard[] = [];
  const maxPerCity = 3;
  const priorityCities = PRIORITY_CITIES.filter((city) => cardsByCity.has(city));

  for (const city of priorityCities) {
    const cityHotels = cardsByCity.get(city) ?? [];
    for (const hotel of cityHotels.slice(0, maxPerCity)) {
      if (selected.length >= limit) break;
      selected.push(hotel);
    }
    if (selected.length >= limit) break;
  }

  if (selected.length < limit) {
    for (const [city, cityHotels] of cardsByCity.entries()) {
      if (priorityCities.includes(city)) continue;
      for (const hotel of cityHotels.slice(0, maxPerCity)) {
        if (selected.length >= limit) break;
        selected.push(hotel);
      }
      if (selected.length >= limit) break;
    }
  }

  if (selected.length < limit) {
    for (const hotel of fallback) {
      if (selected.length >= limit) break;
      selected.push(hotel);
    }
  }

  return selected.slice(0, limit);
}
