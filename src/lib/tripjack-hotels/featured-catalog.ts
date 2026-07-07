import "server-only";

import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";
import { catalogEntryImageUrls } from "@/lib/tripjack-hotels/hotel-images";
import {
  listBrowsableIndiaHotelsPage,
  listFeaturedTripJackHotelsFromFirestore,
} from "@/lib/tripjack-hotels/catalog-firestore";
import {
  hasFeaturedIndianCity,
  isIndiaTripJackCatalogHotel,
  resolveIndianDisplayCity,
} from "@/lib/tripjack-hotels/india-catalog";

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
  "bangalore",
  "hyderabad",
  "chennai",
  "kolkata",
  "pune",
  "agra",
  "udaipur",
  "shimla",
  "manali",
];

const CITY_ALIASES: Record<string, string> = {
  "new delhi": "delhi",
  "delhi ncr": "delhi",
  bengaluru: "bangalore",
  bombay: "mumbai",
  "greater mumbai": "mumbai",
};

function normalizeCity(city: string): string {
  const raw = city.trim().toLowerCase();
  if (!raw) return "";
  if (CITY_ALIASES[raw]) return CITY_ALIASES[raw];
  for (const [alias, key] of Object.entries(CITY_ALIASES)) {
    if (raw.includes(alias)) return key;
  }
  return raw;
}

function cardScore(card: FeaturedTripJackHotelCard): number {
  let score = 0;
  if (card.imageUrls.length > 0) score += 50;
  if (card.starRating && card.starRating > 0) score += 10;
  return score;
}

function isMappingOnlyStub(entry: TripJackHotelCatalogEntry): boolean {
  const name = entry.name.trim();
  return /^hotel\s+\d+$/i.test(name) && !entry.cityName?.trim();
}

function resolveFeaturedCityName(entry: TripJackHotelCatalogEntry): string | null {
  return resolveIndianDisplayCity(entry);
}

export function mapCatalogEntryToFeaturedCard(
  entry: TripJackHotelCatalogEntry
): FeaturedTripJackHotelCard | null {
  const imageUrls = catalogEntryImageUrls(entry);
  if (entry.websiteVisible === false || entry.isDeleted || !entry.contentSynced) return null;
  if (!entry.name?.trim() || isMappingOnlyStub(entry)) return null;
  if (!isIndiaTripJackCatalogHotel(entry)) return null;

  const cityName = resolveFeaturedCityName(entry);
  if (!cityName && !hasFeaturedIndianCity(entry)) {
    const blob = entry.searchBlob?.trim();
    if (!blob) return null;
  }

  const displayCity = cityName ?? entry.stateName?.trim() ?? "India";

  return {
    tjHotelId: entry.tjHotelId,
    name: entry.name,
    cityName: displayCity,
    location: [entry.address, displayCity, entry.stateName, entry.countryName]
      .filter(Boolean)
      .join(", "),
    heroImage: entry.heroImage ?? imageUrls[0],
    imageUrls,
    starRating: entry.starRating ?? entry.rating,
    imageCaption: entry.imageCaption,
  };
}

export async function getFeaturedTripJackHotels(limit = 24): Promise<FeaturedTripJackHotelCard[]> {
  const pickLimit = Math.max(limit * 4, 120);
  let entries = await listFeaturedTripJackHotelsFromFirestore(pickLimit);

  if (entries.length < limit) {
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
    const city = normalizeCity(card.cityName || "");
    if (!city) {
      fallback.push(card);
      continue;
    }
    const list = cardsByCity.get(city) ?? [];
    list.push(card);
    cardsByCity.set(city, list);
  }

  for (const [city, hotels] of cardsByCity.entries()) {
    hotels.sort((a, b) => cardScore(b) - cardScore(a));
    cardsByCity.set(city, hotels);
  }

  const selected: FeaturedTripJackHotelCard[] = [];
  const selectedIds = new Set<number>();
  const maxPerCity = 3;

  const addCard = (card: FeaturedTripJackHotelCard) => {
    if (selected.length >= limit || selectedIds.has(card.tjHotelId)) return;
    selectedIds.add(card.tjHotelId);
    selected.push(card);
  };

  for (const city of PRIORITY_CITIES) {
    const cityHotels = cardsByCity.get(city) ?? [];
    for (const hotel of cityHotels.slice(0, maxPerCity)) {
      addCard(hotel);
      if (selected.length >= limit) break;
    }
    if (selected.length >= limit) break;
  }

  if (selected.length < limit) {
    const otherCities = [...cardsByCity.entries()]
      .filter(([city]) => !PRIORITY_CITIES.includes(city))
      .sort((a, b) => b[1].length - a[1].length);

    for (const [, cityHotels] of otherCities) {
      for (const hotel of cityHotels.slice(0, maxPerCity)) {
        addCard(hotel);
        if (selected.length >= limit) break;
      }
      if (selected.length >= limit) break;
    }
  }

  if (selected.length < limit) {
    for (const hotel of fallback.sort((a, b) => cardScore(b) - cardScore(a))) {
      addCard(hotel);
      if (selected.length >= limit) break;
    }
  }

  return selected.slice(0, limit);
}
