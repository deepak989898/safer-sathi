import {
  demoBlogPosts,
  demoBusRoutes,
  demoHotels,
  demoPackages,
  demoReviews,
  demoVehicles,
} from "@/data/demo-data";
import type { BusRoute, Hotel, SearchFilters, TourPackage, Vehicle } from "@/types";

export async function getVehicles(filters?: SearchFilters): Promise<Vehicle[]> {
  let results = [...demoVehicles];
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
  return demoVehicles.find((v) => v.id === id) ?? null;
}

export async function getPackages(filters?: SearchFilters): Promise<TourPackage[]> {
  let results = [...demoPackages];
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
  return demoPackages.find((p) => p.slug === slug) ?? null;
}

export async function getPackageById(id: string): Promise<TourPackage | null> {
  return demoPackages.find((p) => p.id === id) ?? null;
}

export async function getHotels(filters?: SearchFilters): Promise<Hotel[]> {
  let results = [...demoHotels];
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
  return demoHotels.find((h) => h.slug === slug) ?? null;
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
  return demoPackages.map((p) => p.slug);
}

export function getAllVehicleIds() {
  return demoVehicles.map((v) => v.id);
}

export function getAllHotelSlugs() {
  return demoHotels.map((h) => h.slug);
}

export function getAllBlogSlugs() {
  return demoBlogPosts.map((p) => p.slug);
}
