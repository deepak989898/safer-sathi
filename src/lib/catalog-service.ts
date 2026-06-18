import {
  demoBlogPosts,
  demoBusRoutes,
  demoReviews,
} from "@/data/demo-data";
import {
  getAllPublishedHotelSlugs,
  getHotelBySlugPublished,
  getPublishedHotels,
} from "@/lib/hotel-store";
import {
  getAllPublishedPackageSlugs,
  getPublishedPackageById,
  getPublishedPackageBySlug,
  getPublishedPackages,
} from "@/lib/package-store";
import {
  getAllPublishedVehicleIds,
  getPublishedVehicles,
  getVehicleByIdPublished,
} from "@/lib/vehicle-store";
import type { BusRoute, Hotel, SearchFilters, TourPackage, Vehicle } from "@/types";

export async function getVehicles(filters?: SearchFilters): Promise<Vehicle[]> {
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
  return getVehicleByIdPublished(id);
}

export async function getPackages(filters?: SearchFilters): Promise<TourPackage[]> {
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
  return getPublishedPackageBySlug(slug);
}

export async function getPackageById(id: string): Promise<TourPackage | null> {
  return getPublishedPackageById(id);
}

export async function getHotels(filters?: SearchFilters): Promise<Hotel[]> {
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
  return getHotelBySlugPublished(slug);
}

export async function getBusRoutes(from?: string, to?: string): Promise<BusRoute[]> {
  let results = [...demoBusRoutes];
  if (from) results = results.filter((b) => b.from.toLowerCase().includes(from.toLowerCase()));
  if (to) results = results.filter((b) => b.to.toLowerCase().includes(to.toLowerCase()));
  return results;
}

export async function getBlogPosts() {
  return demoBlogPosts;
}

export async function getBlogPostBySlug(slug: string) {
  return demoBlogPosts.find((p) => p.slug === slug) ?? null;
}

export async function getReviews() {
  return demoReviews;
}

export function getAllPackageSlugs() {
  return getAllPublishedPackageSlugs();
}

export function getAllVehicleIds() {
  return getAllPublishedVehicleIds();
}

export function getAllHotelSlugs() {
  return getAllPublishedHotelSlugs();
}

export function getAllBlogSlugs() {
  return demoBlogPosts.map((p) => p.slug);
}
