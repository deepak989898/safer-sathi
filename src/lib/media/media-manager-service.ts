import { assignBlogImages } from "@/lib/media/blog-image-service";
import { stableBlogRotation } from "@/lib/media/image-intelligence-engine";
import { normalizeImageUrl } from "@/lib/media/destination-image-catalog";
import {
  calculateBlogImageHealth,
  calculateEntityImageHealth,
  createFeaturedUsageTracker,
  FEATURED_MAX_REUSE,
  minImagesForWordCount,
  RELEVANCE_THRESHOLD,
} from "@/lib/media/image-intelligence-engine";
import { mirrorBlogImagePrompts } from "@/lib/media/image-mirror-service";
import { isBannedAltText, optimizeImageUrl } from "@/lib/media/image-seo-generator";
import { listBlogs, updateBlog, hydrateAiCenterStore } from "@/lib/ai-center/repository";
import type { AiBlogPost, BlogImagePrompt } from "@/lib/ai-center/types";
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
import { getVehicleImageUrls } from "@/lib/media/vehicle-images";

export const PACKAGE_IMAGE_MIN = 8;
export const HOTEL_IMAGE_MIN = 8;
export const VEHICLE_IMAGE_MIN = 6;

export interface ImageUsageRecord {
  normalizedUrl: string;
  url: string;
  count: number;
  usedIn: { type: string; id: string; title: string }[];
}

export interface EntityHealthScore {
  id: string;
  title: string;
  type: string;
  score: number;
  imageCount: number;
}

export interface MediaManagerReport {
  generatedAt: string;
  summary: {
    totalImages: number;
    duplicateImageGroups: number;
    featuredOverused: number;
    blogsWithoutImages: number;
    blogsWithFewImages: number;
    missingAltTags: number;
    missingCaptions: number;
    lowRelevanceImages: number;
    optimizationScore: number;
    siteWideHealthScore: number;
    catalog: {
      packagesBelowMin: number;
      hotelsBelowMin: number;
      vehiclesBelowMin: number;
    };
  };
  duplicateImages: ImageUsageRecord[];
  mostUsedImages: ImageUsageRecord[];
  blogsNeedingImages: {
    id: string;
    title: string;
    slug: string;
    imageCount: number;
    minRequired: number;
    healthScore: number;
  }[];
  lowHealthEntities: EntityHealthScore[];
  weeklyScanIssues: string[];
}

function collectBlogUrls(blog: AiBlogPost): string[] {
  const urls = [blog.featuredImage, ...blog.imagePrompts.map((p) => p.url)].filter(Boolean);
  return [...new Set(urls)];
}

function getAltText(p: BlogImagePrompt): string {
  return (p.altText ?? p.alt ?? "").trim();
}

function countMissingAlt(blog: AiBlogPost): number {
  return blog.imagePrompts.filter((p) => p.url && (!getAltText(p) || isBannedAltText(getAltText(p)))).length;
}

function countMissingCaptions(blog: AiBlogPost): number {
  return blog.imagePrompts.filter((p) => p.url && !p.caption?.trim()).length;
}

function countLowRelevance(blog: AiBlogPost): number {
  return blog.imagePrompts.filter((p) => p.url && (p.imageScore ?? 100) < RELEVANCE_THRESHOLD).length;
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

  const mostUsedImages = [...usageMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const featuredOverused = [...usageMap.values()].filter((r) => r.count > FEATURED_MAX_REUSE).length;

  const blogsWithoutImages = blogs.filter((b) => !b.featuredImage?.trim()).length;
  const blogsWithFewImages = blogs.filter((b) => {
    const min = minImagesForWordCount(b.wordCount ?? 1200);
    return collectBlogUrls(b).length < min;
  }).length;
  const missingAltTags = blogs.reduce((sum, b) => sum + countMissingAlt(b), 0);
  const missingCaptions = blogs.reduce((sum, b) => sum + countMissingCaptions(b), 0);
  const lowRelevanceImages = blogs.reduce((sum, b) => sum + countLowRelevance(b), 0);

  const packagesBelowMin = packages.filter((p) => (p.images?.length ?? 0) < PACKAGE_IMAGE_MIN).length;
  const hotelsBelowMin = hotels.filter((h) => (h.images?.length ?? 0) < HOTEL_IMAGE_MIN).length;
  const vehiclesBelowMin = vehicles.filter((v) => (v.images?.length ?? 0) < VEHICLE_IMAGE_MIN).length;

  const blogHealthScores = blogs.map((b) => calculateBlogImageHealth(b));
  const packageHealthScores = packages.map((p) =>
    calculateEntityImageHealth(p.images?.length ?? 0, PACKAGE_IMAGE_MIN)
  );
  const hotelHealthScores = hotels.map((h) =>
    calculateEntityImageHealth(h.images?.length ?? 0, HOTEL_IMAGE_MIN)
  );
  const vehicleHealthScores = vehicles.map((v) =>
    calculateEntityImageHealth(v.images?.length ?? 0, VEHICLE_IMAGE_MIN)
  );

  const allScores = [
    ...blogHealthScores,
    ...packageHealthScores,
    ...hotelHealthScores,
    ...vehicleHealthScores,
  ];
  const siteWideHealthScore =
    allScores.length > 0
      ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
      : 100;

  const totalIssues =
    duplicateImages.length +
    featuredOverused +
    blogsWithoutImages +
    blogsWithFewImages +
    missingAltTags +
    missingCaptions +
    lowRelevanceImages +
    packagesBelowMin +
    hotelsBelowMin +
    vehiclesBelowMin;

  const totalEntities = blogs.length + packages.length + hotels.length + vehicles.length || 1;
  const optimizationScore = Math.max(0, Math.min(100, Math.round(100 - (totalIssues / totalEntities) * 8)));

  const lowHealthEntities: EntityHealthScore[] = [
    ...blogs
      .map((b, i) => ({
        id: b.id,
        title: b.title,
        type: "blog",
        score: blogHealthScores[i],
        imageCount: collectBlogUrls(b).length,
      }))
      .filter((e) => e.score < 70),
    ...packages
      .map((p, i) => ({
        id: p.id,
        title: p.title.en,
        type: "package",
        score: packageHealthScores[i],
        imageCount: p.images?.length ?? 0,
      }))
      .filter((e) => e.score < 70),
    ...hotels
      .map((h, i) => ({
        id: h.id,
        title: h.name.en,
        type: "hotel",
        score: hotelHealthScores[i],
        imageCount: h.images?.length ?? 0,
      }))
      .filter((e) => e.score < 70),
    ...vehicles
      .map((v, i) => ({
        id: v.id,
        title: v.name.en,
        type: "vehicle",
        score: vehicleHealthScores[i],
        imageCount: v.images?.length ?? 0,
      }))
      .filter((e) => e.score < 70),
  ]
    .sort((a, b) => a.score - b.score)
    .slice(0, 50);

  const weeklyScanIssues: string[] = [];
  if (duplicateImages.length > 0) {
    weeklyScanIssues.push(`${duplicateImages.length} image groups used more than 3 times`);
  }
  if (featuredOverused > 0) {
    weeklyScanIssues.push(`${featuredOverused} featured images exceed ${FEATURED_MAX_REUSE}-blog reuse limit`);
  }
  if (missingAltTags > 0) weeklyScanIssues.push(`${missingAltTags} images missing descriptive ALT text`);
  if (missingCaptions > 0) weeklyScanIssues.push(`${missingCaptions} images missing captions`);
  if (lowRelevanceImages > 0) {
    weeklyScanIssues.push(`${lowRelevanceImages} images below relevance score ${RELEVANCE_THRESHOLD}`);
  }
  if (blogsWithFewImages > 0) weeklyScanIssues.push(`${blogsWithFewImages} blogs below word-count image minimum`);
  if (packagesBelowMin + hotelsBelowMin + vehiclesBelowMin > 0) {
    weeklyScanIssues.push(
      `${packagesBelowMin + hotelsBelowMin + vehiclesBelowMin} catalog items below minimum image count`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalImages: usageMap.size,
      duplicateImageGroups: duplicateImages.length,
      featuredOverused,
      blogsWithoutImages,
      blogsWithFewImages,
      missingAltTags,
      missingCaptions,
      lowRelevanceImages,
      optimizationScore,
      siteWideHealthScore,
      catalog: { packagesBelowMin, hotelsBelowMin, vehiclesBelowMin },
    },
    duplicateImages,
    mostUsedImages,
    blogsNeedingImages: blogs
      .filter((b) => {
        const min = minImagesForWordCount(b.wordCount ?? 1200);
        return collectBlogUrls(b).length < min;
      })
      .map((b) => ({
        id: b.id,
        title: b.title,
        slug: b.slug,
        imageCount: collectBlogUrls(b).length,
        minRequired: minImagesForWordCount(b.wordCount ?? 1200),
        healthScore: calculateBlogImageHealth(b),
      }))
      .slice(0, 100),
    lowHealthEntities,
    weeklyScanIssues,
  };
}

export interface BulkFixBlogsResult {
  processed: number;
  updated: number;
  skipped: number;
  errors: string[];
  averageRelevanceScore: number;
}

export async function bulkFixBlogImages(options?: {
  mirrorToFirebase?: boolean;
  status?: AiBlogPost["status"];
}): Promise<BulkFixBlogsResult> {
  await hydrateAiCenterStore();
  const blogs = listBlogs(options?.status);
  const destCounters = new Map<string, number>();
  const reservedUrls = new Set<string>();
  const featuredTracker = createFeaturedUsageTracker();
  const result: BulkFixBlogsResult = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    averageRelevanceScore: 0,
  };
  let scoreSum = 0;

  for (const blog of blogs) {
    result.processed += 1;
    try {
      const rotation =
        stableBlogRotation(blog.slug || blog.id) +
        (destCounters.get(`${blog.keyword}:${blog.title}`.toLowerCase()) ?? 0);
      destCounters.set(
        `${blog.keyword}:${blog.title}`.toLowerCase(),
        (destCounters.get(`${blog.keyword}:${blog.title}`.toLowerCase()) ?? 0) + 1
      );

      const assigned = assignBlogImages({
        title: blog.title,
        keyword: blog.keyword,
        destination: blog.destination,
        category: blog.category,
        wordCount: blog.wordCount,
        rotationIndex: rotation,
        reservedUrls,
        featuredTracker,
      });

      let featuredImage = optimizeImageUrl(assigned.featuredImage);
      let imagePrompts = assigned.imagePrompts.map((p) => ({
        ...p,
        url: optimizeImageUrl(p.url),
      }));

      if (options?.mirrorToFirebase) {
        featuredImage = (
          await mirrorBlogImagePrompts(
            [{ url: featuredImage, fileName: imagePrompts[0]?.fileName }],
            blog.slug
          )
        )[0];
        const mirrored = await mirrorBlogImagePrompts(imagePrompts, blog.slug);
        imagePrompts = imagePrompts.map((p, i) => ({ ...p, url: mirrored[i] ?? p.url }));
      }

      await updateBlog(blog.id, { featuredImage, imagePrompts });
      result.updated += 1;
      scoreSum += assigned.averageScore;
    } catch (err) {
      result.skipped += 1;
      result.errors.push(
        `${blog.slug}: ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  result.averageRelevanceScore =
    result.updated > 0 ? Math.round(scoreSum / result.updated) : 0;
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


function enrichImages(
  existing: string[] | undefined,
  slots: { label: string; url: string }[],
  min: number
): string[] {
  const result = [...(existing ?? [])].map(optimizeImageUrl);
  const seen = new Set(result.map(normalizeImageUrl));
  for (const slot of slots) {
    if (result.length >= min) break;
    const url = optimizeImageUrl(slot.url);
    const key = normalizeImageUrl(url);
    if (seen.has(key)) continue;
    result.push(url);
    seen.add(key);
  }
  while (result.length < min) {
    result.push(optimizeImageUrl(slots[result.length % slots.length].url));
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
    const slug = vehicle.slug ?? vehicle.id;
    const images = getVehicleImageUrls(slug);
    const changed =
      images.length !== (vehicle.images?.length ?? 0) ||
      images.some((url, i) => vehicle.images?.[i] !== url);
    if (changed) {
      await updateVehicleInStore(vehicle.id, { images });
      vehicles += 1;
    }
  }

  return { packages, hotels, vehicles };
}

export async function runWeeklyImageScan(): Promise<MediaManagerReport> {
  return buildMediaManagerReport();
}

export async function bulkFixVehicleImages(): Promise<{ updated: number; total: number }> {
  await hydrateVehiclesStore();
  let updated = 0;
  const vehicles = getAdminVehicles();

  for (const vehicle of vehicles) {
    const slug = vehicle.slug ?? vehicle.id;
    const images = getVehicleImageUrls(slug);
    const changed =
      images.length !== (vehicle.images?.length ?? 0) ||
      images.some((url, i) => vehicle.images?.[i] !== url);
    if (changed) {
      await updateVehicleInStore(vehicle.id, { images });
      updated += 1;
    }
  }

  return { updated, total: vehicles.length };
}
