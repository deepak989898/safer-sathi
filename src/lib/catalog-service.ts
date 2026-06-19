import {
  getAllPublishedHotelSlugs,
  getHotelBySlugPublished,
  getPublishedHotels,
  hydrateHotelsStore,
} from "@/lib/hotel-store";
import {
  getAllPublishedPackageSlugs,
  getPublishedPackageById,
  getPublishedPackageBySlug,
  getPublishedPackages,
  hydratePackagesStore,
} from "@/lib/package-store";
import {
  getAllPublishedVehicleIds,
  getPublishedVehicles,
  getVehicleByIdPublished,
  hydrateVehiclesStore,
} from "@/lib/vehicle-store";
import type { BlogPost, BusRoute, Hotel, SearchFilters, TourPackage, Vehicle } from "@/types";

export async function getVehicles(filters?: SearchFilters): Promise<Vehicle[]> {
  await hydrateVehiclesStore();
  let results = getPublishedVehicles();
  if (filters?.vehicleType) {
    results = results.filter((v) => v.type === filters.vehicleType);
  }
  if (filters?.minPrice) {
    results = results.filter((v) => v.pricePerDay >= filters.minPrice!);
  }
  if (filters?.maxPrice) {
    results = results.filter((v) => v.pricePerDay <= filters.maxPrice!);
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (v) =>
        v.name.en.toLowerCase().includes(q) ||
        v.name.hi.includes(q) ||
        v.location.toLowerCase().includes(q)
    );
  }
  return results;
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  await hydrateVehiclesStore();
  return getVehicleByIdPublished(id);
}

export async function getPackages(filters?: SearchFilters): Promise<TourPackage[]> {
  await hydratePackagesStore();
  let results = getPublishedPackages();
  if (filters?.packageCategory) {
    results = results.filter((p) => p.category === filters.packageCategory);
  }
  if (filters?.minPrice) {
    results = results.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters?.maxPrice) {
    results = results.filter((p) => p.price <= filters.maxPrice!);
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (p) =>
        p.title.en.toLowerCase().includes(q) ||
        p.cities.some((c) => c.toLowerCase().includes(q))
    );
  }
  return results;
}

export async function getPackageBySlug(slug: string): Promise<TourPackage | null> {
  await hydratePackagesStore();
  return getPublishedPackageBySlug(slug);
}

export async function getPackageById(id: string): Promise<TourPackage | null> {
  await hydratePackagesStore();
  return getPublishedPackageById(id);
}

export async function getHotels(filters?: SearchFilters): Promise<Hotel[]> {
  await hydrateHotelsStore();
  let results = getPublishedHotels();
  if (filters?.starRating) {
    results = results.filter((h) => h.starRating >= filters.starRating!);
  }
  if (filters?.minPrice) {
    results = results.filter((h) => h.priceFrom >= filters.minPrice!);
  }
  if (filters?.maxPrice) {
    results = results.filter((h) => h.priceFrom <= filters.maxPrice!);
  }
  if (filters?.location) {
    const loc = filters.location.toLowerCase();
    results = results.filter(
      (h) =>
        h.city.toLowerCase().includes(loc) ||
        h.location.toLowerCase().includes(loc)
    );
  }
  return results;
}

export async function getHotelBySlug(slug: string): Promise<Hotel | null> {
  await hydrateHotelsStore();
  return getHotelBySlugPublished(slug);
}

export async function getBusRoutes(from?: string, to?: string): Promise<BusRoute[]> {
  return [];
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  return [];
}

export async function getBlogPostBySlug(_slug: string): Promise<BlogPost | null> {
  return null;
}

export async function getReviews() {
  return [];
}

export async function getAllPackageSlugs() {
  await hydratePackagesStore();
  return getAllPublishedPackageSlugs();
}

export async function getAllVehicleIds() {
  await hydrateVehiclesStore();
  return getAllPublishedVehicleIds();
}

export async function getAllHotelSlugs() {
  await hydrateHotelsStore();
  return getAllPublishedHotelSlugs();
}

export function getAllBlogSlugs() {
  return [];
}
