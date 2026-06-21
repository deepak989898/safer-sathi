import { getHotelsSeed } from "@/data/hotels-seed";
import { getTourPackagesSeed } from "@/data/tour-packages-seed";
import { getVehiclesSeed } from "@/data/vehicles-seed";
import { MOBILE_HOME_SHOWCASE_LIMIT } from "@/lib/site-config";
import type { Hotel, TourPackage, Vehicle } from "@/types";

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

export function buildHomepageVehicles(live: Vehicle[], limit = MOBILE_HOME_SHOWCASE_LIMIT) {
  const seed = getVehiclesSeed().filter((v) => v.available !== false);
  return mergeShowcaseCatalog(live, seed, limit);
}
