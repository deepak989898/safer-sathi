import { getHotelsSeed } from "@/data/hotels-seed";
import { getTourPackagesSeed } from "@/data/tour-packages-seed";
import { getVehiclesSeed } from "@/data/vehicles-seed";
import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { MOBILE_HOME_SHOWCASE_LIMIT } from "@/lib/site-config";
import type { FeaturedTripJackHotelCard } from "@/lib/tripjack-hotels/featured-catalog-types";
import type { Hotel, TourPackage, Vehicle } from "@/types";

export interface PopularDestinationItem {
  name: string;
  subtitle: string;
  price: number;
  image: string;
  href: string;
  imagePosition?: string;
}

const POPULAR_DESTINATION_CONFIG = [
  {
    name: "Rajasthan",
    subtitle: "Royal Heritage",
    keywords: ["rajasthan", "jaipur", "udaipur", "jodhpur", "jaisalmer"],
    query: "Rajasthan",
    fallbackPrice: 4999,
    fallbackImage: TRAVEL_IMAGES.goldenTriangle,
  },
  {
    name: "Kerala",
    subtitle: "Backwaters & Hills",
    keywords: ["kerala", "kochi", "munnar", "alleppey", "thekkady"],
    query: "Kerala",
    fallbackPrice: 5999,
    fallbackImage: TRAVEL_IMAGES.keralaBackwaters,
  },
  {
    name: "Goa",
    subtitle: "Beaches & Nightlife",
    keywords: ["goa", "north goa", "south goa", "calangute", "panaji"],
    query: "Goa",
    fallbackPrice: 3999,
    fallbackImage: TRAVEL_IMAGES.beachResort,
    imagePosition: "center top",
  },
  {
    name: "Himachal",
    subtitle: "Mountains & Adventure",
    keywords: ["himachal", "manali", "shimla", "dharamshala", "kasol"],
    query: "Manali",
    fallbackPrice: 5499,
    fallbackImage: TRAVEL_IMAGES.manaliAdventure,
  },
  {
    name: "Kashmir",
    subtitle: "Paradise on Earth",
    keywords: ["kashmir", "srinagar", "gulmarg", "pahalgam", "sonamarg"],
    query: "Kashmir",
    fallbackPrice: 6999,
    fallbackImage: TRAVEL_IMAGES.charDham,
  },
] as const;

function isPublishedPackage(pkg: TourPackage): boolean {
  return !pkg.publishStatus || pkg.publishStatus === "published";
}

function packageMatchesDestination(
  pkg: TourPackage,
  keywords: readonly string[]
): boolean {
  const haystack = [pkg.title.en, pkg.title.hi, ...pkg.cities, pkg.slug]
    .join(" ")
    .toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

/** Map homepage destination tiles to live package images when available. */
export function buildPopularDestinations(
  packages: TourPackage[]
): PopularDestinationItem[] {
  const published = packages.filter(isPublishedPackage);

  return POPULAR_DESTINATION_CONFIG.map((config) => {
    const matches = published
      .filter((pkg) => packageMatchesDestination(pkg, config.keywords))
      .sort((a, b) => Number(b.featured) - Number(a.featured));

    const match = matches[0];

    if (match?.images[0]) {
      return {
        name: config.name,
        subtitle: config.subtitle,
        price: match.price,
        image: match.images[0],
        href: `/packages/${match.slug}`,
        imagePosition: "imagePosition" in config ? config.imagePosition : "center",
      };
    }

    return {
      name: config.name,
      subtitle: config.subtitle,
      price: config.fallbackPrice,
      image: config.fallbackImage,
      href: `/packages?query=${encodeURIComponent(config.query)}`,
      imagePosition: "imagePosition" in config ? config.imagePosition : "center",
    };
  });
}

export interface MobileShowcaseItem {
  id: string;
  slug: string;
  href: string;
  image: string;
  title: string;
  subtitle: string;
  price: number;
}

type Slugged = { id: string; slug?: string; featured?: boolean };

/** Live catalog wins on duplicate slug; seed fills the list up to limit. */
export function mergeShowcaseCatalog<T extends Slugged>(
  live: T[],
  seed: T[],
  limit: number
): T[] {
  const map = new Map<string, T>();

  for (const item of seed) {
    map.set(item.slug ?? item.id, item);
  }
  for (const item of live) {
    map.set(item.slug ?? item.id, item);
  }

  return Array.from(map.values())
    .sort((a, b) => Number(b.featured) - Number(a.featured))
    .slice(0, limit);
}

export function buildHomepagePackages(live: TourPackage[], limit = MOBILE_HOME_SHOWCASE_LIMIT) {
  const seed = getTourPackagesSeed().filter(
    (p) => !p.publishStatus || p.publishStatus === "published"
  );
  return mergeShowcaseCatalog(live, seed, limit);
}

export function buildHomepageHotels(live: Hotel[], limit = MOBILE_HOME_SHOWCASE_LIMIT) {
  const seed = getHotelsSeed().filter((h) => h.available !== false);
  return mergeShowcaseCatalog(live, seed, limit);
}

/** TripJack featured card → catalog Hotel shape for homepage cards. */
export function mapFeaturedTripJackToHomepageHotel(
  card: FeaturedTripJackHotelCard
): Hotel {
  const now = new Date().toISOString();
  const images =
    card.imageUrls.length > 0
      ? card.imageUrls
      : card.heroImage
        ? [card.heroImage]
        : [];
  const starRating = Math.max(1, Math.min(5, Math.round(card.starRating ?? 3)));
  const locality = card.locality?.trim() || card.location;

  return {
    id: `tj-${card.tjHotelId}`,
    slug: `detail/${card.tjHotelId}`,
    name: { en: card.name, hi: card.name },
    starRating,
    location: locality,
    city: card.cityName,
    country: "India",
    images,
    amenities: card.facilities.slice(0, 6),
    description: { en: card.name, hi: card.name },
    // Live rates load on the detail page; homepage shows "View rates" when 0.
    priceFrom: 0,
    rooms: [],
    rating: card.starRating && card.starRating > 0 ? card.starRating : starRating,
    reviewCount: 0,
    featured: true,
    available: true,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Prefer TripJack featured hotels when website visibility is on.
 * Fall back to manual/seed hotels when TripJack is hidden or unavailable.
 */
export function buildHomepageTopHotels(input: {
  tripjackEnabled: boolean;
  tripjackHotels: FeaturedTripJackHotelCard[];
  manualHotels: Hotel[];
  limit?: number;
}): Hotel[] {
  const limit = input.limit ?? MOBILE_HOME_SHOWCASE_LIMIT;

  if (input.tripjackEnabled && input.tripjackHotels.length > 0) {
    return input.tripjackHotels
      .slice(0, limit)
      .map(mapFeaturedTripJackToHomepageHotel);
  }

  return buildHomepageHotels(input.manualHotels, limit);
}

export function toMobileTripJackHotelItems(
  cards: FeaturedTripJackHotelCard[],
  limit = MOBILE_HOME_SHOWCASE_LIMIT
): MobileShowcaseItem[] {
  return cards.slice(0, limit).map((card) => ({
    id: `tj-${card.tjHotelId}`,
    slug: `detail/${card.tjHotelId}`,
    href: `/hotels/detail/${card.tjHotelId}`,
    image: card.heroImage ?? card.imageUrls[0] ?? "",
    title: card.cityName || card.location,
    subtitle: `${card.starRating && card.starRating > 0 ? card.starRating : 3} Star · per night`,
    price: 0,
  }));
}

export function buildHomepageVehicles(live: Vehicle[], limit = MOBILE_HOME_SHOWCASE_LIMIT) {
  const seed = getVehiclesSeed().filter((v) => v.available !== false);
  return mergeShowcaseCatalog(live, seed, limit);
}

export function toMobilePackageItems(
  packages: TourPackage[],
  limit = MOBILE_HOME_SHOWCASE_LIMIT
): MobileShowcaseItem[] {
  const seed = getTourPackagesSeed().filter(
    (p) => !p.publishStatus || p.publishStatus === "published"
  );
  const merged = mergeShowcaseCatalog(packages, seed, limit);

  // Always fill from full seed catalog so mobile home shows up to 20 cards
  const filled =
    merged.length >= limit
      ? merged
      : mergeShowcaseCatalog([], seed, limit);

  return filled.map((pkg) => ({
    id: pkg.id,
    slug: pkg.slug,
    href: `/packages/${pkg.slug}`,
    image: pkg.images[0] ?? "",
    title: pkg.cities[0] ?? pkg.title.en,
    subtitle: pkg.durationLabel.en,
    price: pkg.price,
  }));
}

export function toMobileHotelItems(
  hotels: Hotel[],
  limit = MOBILE_HOME_SHOWCASE_LIMIT
): MobileShowcaseItem[] {
  const seed = getHotelsSeed().filter((h) => h.available !== false);
  const merged = mergeShowcaseCatalog(hotels, seed, limit);
  const filled =
    merged.length >= limit ? merged : mergeShowcaseCatalog([], seed, limit);

  return filled.map((hotel) => ({
    id: hotel.id,
    slug: hotel.slug,
    href: `/hotels/${hotel.slug}`,
    image: hotel.images[0] ?? "",
    title: hotel.city || hotel.location,
    subtitle: `${hotel.starRating} Star · per night`,
    price: hotel.priceFrom,
  }));
}

export function toMobileVehicleItems(
  vehicles: Vehicle[],
  limit = MOBILE_HOME_SHOWCASE_LIMIT
): MobileShowcaseItem[] {
  const seed = getVehiclesSeed().filter((v) => v.available !== false);
  const merged = mergeShowcaseCatalog(vehicles, seed, limit);
  const filled =
    merged.length >= limit ? merged : mergeShowcaseCatalog([], seed, limit);

  return filled.map((vehicle) => ({
    id: vehicle.id,
    slug: vehicle.id,
    href: `/vehicles/${vehicle.id}`,
    image: vehicle.images[0] ?? "",
    title: vehicle.location,
    subtitle: vehicle.name.en,
    price: vehicle.pricePerDay,
  }));
}
