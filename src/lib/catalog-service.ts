import {
  getAllPublishedHotelSlugs,
  getHotelByIdAdmin,
  getHotelBySlugPublished,
  getPublishedHotels,
  reloadHotelsStore,
} from "@/lib/hotel-store";
import { isCatalogPublished } from "@/lib/catalog/publish";
import {
  getAllPublishedPackageSlugs,
  getPublishedPackageById,
  getPublishedPackageBySlug,
  getPublishedPackages,
  reloadPackagesStore,
} from "@/lib/package-store";
import {
  getAllPublishedVehicleIds,
  getPublishedVehicles,
  getVehicleByIdPublished,
  reloadVehiclesStore,
} from "@/lib/vehicle-store";
import {
  getAllPublishedBlogSlugs,
  getBlogCategories,
  getPublishedBlogPostBySlug,
  getPublishedBlogBySlug,
  getPublishedBlogPosts,
  getRelatedBlogPosts,
  hydrateBlogStore,
} from "@/lib/blog-store";
import { syncHotelPriceFrom } from "@/lib/catalog/hotel-pricing";
import { getTourPackagesSeed } from "@/data/tour-packages-seed";
import type { BlogPost, BusRoute, Hotel, SearchFilters, TourPackage, Vehicle } from "@/types";

function normalizeHotelForCatalog(hotel: Hotel): Hotel {
  const priceFrom = syncHotelPriceFrom(hotel);
  return priceFrom === hotel.priceFrom ? hotel : { ...hotel, priceFrom };
}

export async function getVehicles(filters?: SearchFilters): Promise<Vehicle[]> {
  await reloadVehiclesStore();
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
  await reloadVehiclesStore();
  return getVehicleByIdPublished(id);
}

export async function getPackages(filters?: SearchFilters): Promise<TourPackage[]> {
  await reloadPackagesStore();
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
  await reloadPackagesStore();
  const found = getPublishedPackageBySlug(slug);
  if (found) return found;
  return (
    getTourPackagesSeed().find(
      (p) => p.slug === slug && (!p.publishStatus || p.publishStatus === "published")
    ) ?? null
  );
}

export async function getPackageById(id: string): Promise<TourPackage | null> {
  await reloadPackagesStore();
  return getPublishedPackageById(id);
}

export async function getHotels(filters?: SearchFilters): Promise<Hotel[]> {
  await reloadHotelsStore();
  let results = getPublishedHotels().map(normalizeHotelForCatalog);
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
  await reloadHotelsStore();
  const hotel = getHotelBySlugPublished(slug);
  return hotel ? normalizeHotelForCatalog(hotel) : null;
}

export async function getHotelById(id: string): Promise<Hotel | null> {
  await reloadHotelsStore();
  const hotel = getHotelByIdAdmin(id);
  if (!hotel?.available || !isCatalogPublished(hotel.publishStatus)) return null;
  return normalizeHotelForCatalog(hotel);
}

export async function getBusRoutes(from?: string, to?: string): Promise<BusRoute[]> {
  return [];
}

export async function getBlogPosts(): Promise<BlogPost[]> {
  await hydrateBlogStore();
  return getPublishedBlogPosts();
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const post = await getPublishedBlogPostBySlug(slug);
  if (post) return post;
  await hydrateBlogStore();
  return getPublishedBlogBySlug(slug);
}

export async function getReviews() {
  const { getPublicReviews } = await import("@/lib/ai-center/phase3-repository");
  return getPublicReviews();
}

export async function getAllPackageSlugs() {
  await reloadPackagesStore();
  return getAllPublishedPackageSlugs();
}

export async function getAllVehicleIds() {
  await reloadVehiclesStore();
  return getAllPublishedVehicleIds();
}

export async function getAllHotelSlugs() {
  await reloadHotelsStore();
  return getAllPublishedHotelSlugs();
}

export async function getAllBlogSlugs() {
  await hydrateBlogStore();
  return getAllPublishedBlogSlugs();
}

export async function getBlogCategoriesList(): Promise<string[]> {
  await hydrateBlogStore();
  return getBlogCategories();
}

export async function getRelatedBlogPostsForSlug(slug: string, limit = 3) {
  await hydrateBlogStore();
  return getRelatedBlogPosts(slug, limit);
}
