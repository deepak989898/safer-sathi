import { assignBlogImages } from "@/lib/media/blog-image-service";
import { normalizeImageUrl } from "@/lib/media/destination-image-catalog";
import { mirrorImages } from "@/lib/media/image-mirror-service";
import { listBlogs, updateBlog, hydrateAiCenterStore } from "@/lib/ai-center/repository";
import type { AiBlogPost } from "@/lib/ai-center/types";
import {
  hydratePackagesStore,
  getAdminPackages,
  updatePackageInStore,
} from "@/lib/package-store";
import {
  hydrateHotelsStore,
  getAdminHotels,
  updateHotelInStore,
} from "@/lib/hotel-store";
import {
  hydrateVehiclesStore,
  getAdminVehicles,
  updateVehicleInStore,
} from "@/lib/vehicle-store";
import { TRAVEL_IMAGES } from "@/lib/media/travel-images";

export const PACKAGE_IMAGE_MIN = 8;
export const HOTEL_IMAGE_MIN = 8;
export const VEHICLE_IMAGE_MIN = 6;

export interface ImageUsageRecord {
  normalizedUrl: string;
  url: string;
  count: number;
  usedIn: { type: string; id: string; title: string }[];
}

export interface MediaManagerReport {
  generatedAt: string;
  summary: {
    totalImages: number;
    duplicateImageGroups: number;
    blogsWithoutImages: number;
    blogsWithFewImages: number;
    missingAltTags: number;
    optimizationScore: number;
    catalog: {
      packagesBelowMin: number;
      hotelsBelowMin: number;
      vehiclesBelowMin: number;
    };
  };
  duplicateImages: ImageUsageRecord[];
  blogsNeedingImages: { id: string; title: string; slug: string; imageCount: number }[];
  unusedCatalogUrls: string[];
}

function collectBlogUrls(blog: AiBlogPost): string[] {
  const urls = [blog.featuredImage, ...blog.imagePrompts.map((p) => p.url)].filter(Boolean);
  return [...new Set(urls)];
}

function countMissingAlt(blog: AiBlogPost): number {
  return blog.imagePrompts.filter((p) => p.url && !p.alt?.trim()).length;
}

export async function buildMediaManagerReport(): Promise<MediaManagerReport> {
  await hydrateAiCenterStore();
  await hydratePackagesStore();
  await hydrateHotelsStore();
  await hydrateVehiclesStore();

  const blogs = listBlogs();
  const packages = getAdminPackages();
  const hotels = getAdminHotels();
  const vehicles = getAdminVehicles();

  const usageMap = new Map<string, ImageUsageRecord>();

  const track = (url: string, type: string, id: string, title: string) => {
    if (!url?.trim()) return;
    const normalized = normalizeImageUrl(url);
    const existing = usageMap.get(normalized);
    if (existing) {
      existing.count += 1;
      existing.usedIn.push({ type, id, title });
    } else {
      usageMap.set(normalized, {
        normalizedUrl: normalized,
        url,
        count: 1,
        usedIn: [{ type, id, title }],
      });
    }
  };

  for (const blog of blogs) {
    for (const url of collectBlogUrls(blog)) {
      track(url, "blog", blog.id, blog.title);
    }
  }
  for (const pkg of packages) {
    for (const url of pkg.images ?? []) track(url, "package", pkg.id, pkg.title.en);
  }
  for (const hotel of hotels) {
    for (const url of hotel.images ?? []) track(url, "hotel", hotel.id, hotel.name.en);
  }
  for (const vehicle of vehicles) {
    for (const url of vehicle.images ?? []) track(url, "vehicle", vehicle.id, vehicle.name.en);
  }

  const duplicateImages = [...usageMap.values()]
    .filter((r) => r.count > 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  const blogsWithoutImages = blogs.filter((b) => !b.featuredImage?.trim()).length;
  const blogsWithFewImages = blogs.filter((b) => collectBlogUrls(b).length < 4).length;
  const missingAltTags = blogs.reduce((sum, b) => sum + countMissingAlt(b), 0);

  const packagesBelowMin = packages.filter((p) => (p.images?.length ?? 0) < PACKAGE_IMAGE_MIN).length;
  const hotelsBelowMin = hotels.filter((h) => (h.images?.length ?? 0) < HOTEL_IMAGE_MIN).length;
  const vehiclesBelowMin = vehicles.filter((v) => (v.images?.length ?? 0) < VEHICLE_IMAGE_MIN).length;

  const totalIssues =
    duplicateImages.length +
    blogsWithoutImages +
    blogsWithFewImages +
    missingAltTags +
    packagesBelowMin +
    hotelsBelowMin +
    vehiclesBelowMin;

  const totalEntities = blogs.length + packages.length + hotels.length + vehicles.length || 1;
  const optimizationScore = Math.max(0, Math.min(100, Math.round(100 - (totalIssues / totalEntities) * 10)));

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalImages: usageMap.size,
      duplicateImageGroups: duplicateImages.length,
      blogsWithoutImages,
      blogsWithFewImages,
      missingAltTags,
      optimizationScore,
      catalog: { packagesBelowMin, hotelsBelowMin, vehiclesBelowMin },
    },
    duplicateImages,
    blogsNeedingImages: blogs
      .filter((b) => collectBlogUrls(b).length < 4)
      .map((b) => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        imageCount: collectBlogUrls(b).length,
      }))
      .slice(0, 100),
    unusedCatalogUrls: [],
  };
}

export interface BulkFixBlogsResult {
  processed: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export async function bulkFixBlogImages(options?: {
  mirrorToFirebase?: boolean;
  status?: AiBlogPost["status"];
}): Promise<BulkFixBlogsResult> {
  await hydrateAiCenterStore();
  const blogs = listBlogs(options?.status);
  const destCounters = new Map<string, number>();
  const reservedUrls = new Set<string>();
  const result: BulkFixBlogsResult = { processed: 0, updated: 0, skipped: 0, errors: [] };

  for (const blog of blogs) {
    result.processed += 1;
    try {
      const destKey = `${blog.destination ?? ""}:${blog.keyword}`.toLowerCase();
      const rotation = destCounters.get(destKey) ?? 0;
      destCounters.set(destKey, rotation + 1);

      const assigned = assignBlogImages({
        title: blog.title,
        keyword: blog.keyword,
        destination: blog.destination,
        category: blog.category,
        rotationIndex: rotation,
        reservedUrls,
      });

      let featuredImage = assigned.featuredImage;
      let imagePrompts = assigned.imagePrompts;

      if (options?.mirrorToFirebase) {
        featuredImage = (await mirrorImages([featuredImage], "blogs", blog.slug))[0];
        const mirrored = await mirrorImages(
          imagePrompts.map((p) => p.url),
          "blogs",
          blog.slug
        );
        imagePrompts = imagePrompts.map((p, i) => ({ ...p, url: mirrored[i] ?? p.url }));
      }

      await updateBlog(blog.id, { featuredImage, imagePrompts });
      result.updated += 1;
    } catch (err) {
      result.skipped += 1;
      result.errors.push(
        `${blog.slug}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  return result;
}

const PACKAGE_SLOTS = [
  { label: "Destination", url: TRAVEL_IMAGES.goldenTriangle },
  { label: "Hotel", url: TRAVEL_IMAGES.hotelLuxury },
  { label: "Activities", url: TRAVEL_IMAGES.manaliAdventure },
  { label: "Vehicle", url: TRAVEL_IMAGES.luxuryCar },
  { label: "Sightseeing", url: TRAVEL_IMAGES.jaipurFort },
  { label: "Meals", url: TRAVEL_IMAGES.hotelLake },
  { label: "Adventure", url: TRAVEL_IMAGES.adventureRafting },
  { label: "Landscape", url: TRAVEL_IMAGES.himalayaMountains },
];

const HOTEL_SLOTS = [
  { label: "Front View", url: TRAVEL_IMAGES.hotelLuxury },
  { label: "Lobby", url: TRAVEL_IMAGES.hotelLake },
  { label: "Room", url: TRAVEL_IMAGES.mountainResort },
  { label: "Bathroom", url: TRAVEL_IMAGES.beachResort },
  { label: "Restaurant", url: TRAVEL_IMAGES.hotelLuxury },
  { label: "Pool", url: TRAVEL_IMAGES.beachResort },
  { label: "Amenities", url: TRAVEL_IMAGES.hotelLake },
  { label: "Exterior", url: TRAVEL_IMAGES.jaipurFort },
];

const VEHICLE_SLOTS = [
  { label: "Front", url: TRAVEL_IMAGES.sedan },
  { label: "Rear", url: TRAVEL_IMAGES.luxuryCar },
  { label: "Interior", url: TRAVEL_IMAGES.suv },
  { label: "Seats", url: TRAVEL_IMAGES.bus },
  { label: "Luggage Space", url: TRAVEL_IMAGES.tempo },
  { label: "Side View", url: TRAVEL_IMAGES.sportsCar },
];

function enrichImages(existing: string[], slots: { url: string }[], min: number): string[] {
  const result = [...(existing ?? [])];
  const seen = new Set(result.map(normalizeImageUrl));
  for (const slot of slots) {
    if (result.length >= min) break;
    const key = normalizeImageUrl(slot.url);
    if (seen.has(key)) continue;
    result.push(slot.url);
    seen.add(key);
  }
  while (result.length < min) {
    result.push(slots[result.length % slots.length].url);
  }
  return result.slice(0, Math.max(min, result.length));
}

export async function bulkEnrichCatalogImages(): Promise<{
  packages: number;
  hotels: number;
  vehicles: number;
}> {
  await hydratePackagesStore();
  await hydrateHotelsStore();
  await hydrateVehiclesStore();

  let packages = 0;
  let hotels = 0;
  let vehicles = 0;

  for (const pkg of getAdminPackages()) {
    const images = enrichImages(pkg.images ?? [], PACKAGE_SLOTS, PACKAGE_IMAGE_MIN);
    if (images.length !== (pkg.images?.length ?? 0)) {
      await updatePackageInStore(pkg.id, { images });
      packages += 1;
    }
  }

  for (const hotel of getAdminHotels()) {
    const images = enrichImages(hotel.images ?? [], HOTEL_SLOTS, HOTEL_IMAGE_MIN);
    if (images.length !== (hotel.images?.length ?? 0)) {
      await updateHotelInStore(hotel.id, { images });
      hotels += 1;
    }
  }

  for (const vehicle of getAdminVehicles()) {
    const images = enrichImages(vehicle.images ?? [], VEHICLE_SLOTS, VEHICLE_IMAGE_MIN);
    if (images.length !== (vehicle.images?.length ?? 0)) {
      await updateVehicleInStore(vehicle.id, { images });
      vehicles += 1;
    }
  }

  return { packages, hotels, vehicles };
}
