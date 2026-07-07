import type { NormalizedHotel, NormalizedHotelOption } from "@/lib/tripjack-hotels/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export interface TripJackHotelImageRecord {
  caption?: string;
  is_hero_image?: boolean;
  isHeroImage?: boolean;
  category?: string;
  links?: Record<string, unknown>;
  url?: string;
  sz?: string;
}

export interface ParsedTripJackHotelImages {
  /** Original TripJack image objects from content API */
  rawImages: unknown[];
  imageUrls: string[];
  heroImage?: string;
  imageCaption?: string;
}

const LINK_SIZE_PRIORITY = ["original", "1000px", "500px", "350px", "200px", "70px"];

function normalizeHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

function isValidHttpUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

function extractHref(entry: unknown): string {
  if (typeof entry === "string") return normalizeHref(entry);
  const rec = asRecord(entry);
  if (!rec) return "";
  for (const key of ["href", "url", "src", "link"]) {
    const value = rec[key];
    if (typeof value === "string" && value.trim()) {
      return normalizeHref(value);
    }
  }
  return "";
}

/** Pick best URL from TripJack `image.links` object (original → 1000px → … → any). */
export function pickHrefFromImageLinks(links: unknown): string {
  const rec = asRecord(links);
  if (!rec) return typeof links === "string" ? normalizeHref(links) : "";

  for (const key of LINK_SIZE_PRIORITY) {
    const href = extractHref(rec[key]);
    if (href && isValidHttpUrl(href)) return href;
  }

  for (const value of Object.values(rec)) {
    const href = extractHref(value);
    if (href && isValidHttpUrl(href)) return href;
  }

  return "";
}

function pickLegacyUrlFromUnknown(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const trimmed = normalizeHref(value);
    return isValidHttpUrl(trimmed) ? trimmed : "";
  }
  const rec = asRecord(value);
  if (!rec) return "";

  const fromLinks = pickHrefFromImageLinks(rec.links);
  if (fromLinks) return fromLinks;

  for (const key of ["url", "imageUrl", "link", "path", "src", "href", "image"]) {
    const candidate = rec[key];
    if (typeof candidate === "string" && candidate.trim()) {
      const url = normalizeHref(candidate);
      if (isValidHttpUrl(url)) return url;
    }
  }
  return "";
}

function isHeroImageRecord(rec: Record<string, unknown>): boolean {
  return rec.is_hero_image === true || rec.isHeroImage === true;
}

function collectRawImageItems(value: unknown): unknown[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const rec = asRecord(value);
  if (!rec) return [];
  if (Array.isArray(rec.images)) return rec.images;
  if (Array.isArray(rec.imageList)) return rec.imageList;
  return [value];
}

/** Parse TripJack V3 static content `images[]` (links.original.href, is_hero_image, etc.). */
export function parseTripJackHotelImages(...sources: unknown[]): ParsedTripJackHotelImages {
  const rawImages: unknown[] = [];
  for (const source of sources) {
    for (const item of collectRawImageItems(source)) {
      if (item != null) rawImages.push(item);
    }
  }

  const imageUrls: string[] = [];
  let heroImage: string | undefined;
  let heroCaption: string | undefined;
  let firstCaption: string | undefined;

  for (const item of rawImages) {
    if (typeof item === "string") {
      const url = normalizeHref(item);
      if (isValidHttpUrl(url) && !imageUrls.includes(url)) imageUrls.push(url);
      continue;
    }

    const rec = asRecord(item);
    if (!rec) continue;

    const caption = typeof rec.caption === "string" ? rec.caption.trim() : "";
    let url = pickHrefFromImageLinks(rec.links);
    if (!url) url = pickLegacyUrlFromUnknown(rec);
    if (!url || !isValidHttpUrl(url)) continue;

    if (!imageUrls.includes(url)) imageUrls.push(url);
    if (!firstCaption && caption) firstCaption = caption;

    if (isHeroImageRecord(rec)) {
      heroImage = url;
      if (caption) heroCaption = caption;
    }
  }

  return {
    rawImages,
    imageUrls,
    heroImage: heroImage ?? imageUrls[0],
    imageCaption: heroCaption ?? firstCaption,
  };
}

/** Extract image URLs from TripJack arrays (V3 links format or legacy url/sz objects). */
export function extractImageUrlList(value: unknown): string[] {
  const parsed = parseTripJackHotelImages(value);
  if (parsed.imageUrls.length) return parsed.imageUrls;

  if (!value) return [];
  if (typeof value === "string") {
    const url = pickLegacyUrlFromUnknown(value);
    return url ? [url] : [];
  }
  if (!Array.isArray(value)) {
    const url = pickLegacyUrlFromUnknown(value);
    return url ? [url] : [];
  }

  const urls: string[] = [];
  for (const item of value) {
    const url = pickLegacyUrlFromUnknown(item);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

export function resolveHotelImageCandidates(input: {
  imageUrl?: string;
  images?: unknown;
  imageUrls?: string[];
  heroImage?: string;
  staticContent?: { images?: unknown };
  options?: NormalizedHotelOption[];
}): string[] {
  const candidates: string[] = [];

  const push = (url?: string) => {
    if (!url || !isValidHttpUrl(url) || candidates.includes(url)) return;
    candidates.push(url);
  };

  push(input.heroImage);
  for (const url of input.imageUrls ?? []) push(url);

  const fromImages = parseTripJackHotelImages(input.images);
  push(fromImages.heroImage);
  for (const url of fromImages.imageUrls) push(url);

  push(input.imageUrl);

  const fromStatic = parseTripJackHotelImages(input.staticContent?.images);
  push(fromStatic.heroImage);
  for (const url of fromStatic.imageUrls) push(url);

  for (const option of input.options ?? []) {
    for (const url of extractImageUrlList(option.roomImages)) push(url);
  }

  return candidates;
}

export function resolveHotelCardImageUrl(hotel: NormalizedHotel): string | undefined {
  return resolveHotelImageCandidates({
    imageUrl: hotel.imageUrl,
    images: hotel.images,
    imageUrls: hotel.imageUrls,
    heroImage: hotel.heroImage,
    staticContent: hotel.staticContent,
    options: hotel.options,
  })[0];
}

export function explainHotelImageResolution(hotel: NormalizedHotel): {
  selectedUrl?: string;
  steps: string[];
  firstRawImage?: unknown;
  heroImage?: string;
  imageUrls?: string[];
} {
  const steps: string[] = [];
  const candidates = resolveHotelImageCandidates({
    imageUrl: hotel.imageUrl,
    images: hotel.images,
    imageUrls: hotel.imageUrls,
    heroImage: hotel.heroImage,
    staticContent: hotel.staticContent,
    options: hotel.options,
  });

  if (hotel.heroImage) steps.push(`heroImage set: ${hotel.heroImage}`);
  else steps.push("heroImage missing");

  if (hotel.imageUrls?.length) steps.push(`imageUrls: ${hotel.imageUrls.length} URL(s)`);
  else steps.push("imageUrls missing");

  const parsed = parseTripJackHotelImages(hotel.images, hotel.staticContent?.images);
  if (parsed.rawImages.length) {
    steps.push(`raw images[]: ${parsed.rawImages.length} item(s)`);
    if (parsed.heroImage) steps.push(`parsed hero from links: ${parsed.heroImage}`);
    else steps.push("no href found in images[].links");
  } else {
    steps.push("raw images[] empty");
  }

  if (hotel.imageUrl) steps.push(`legacy imageUrl: ${hotel.imageUrl}`);
  if (!candidates.length) steps.push("fallback: NO IMAGE placeholder");

  const rawFirst = parsed.rawImages[0];
  return {
    selectedUrl: candidates[0],
    steps,
    firstRawImage: rawFirst,
    heroImage: hotel.heroImage ?? parsed.heroImage,
    imageUrls: hotel.imageUrls?.length ? hotel.imageUrls : parsed.imageUrls,
  };
}

export function catalogEntryImageUrls(entry: {
  imageUrls?: string[];
  heroImage?: string;
  images?: unknown;
  rawImages?: unknown;
}): string[] {
  if (entry.imageUrls?.length) return entry.imageUrls;
  if (Array.isArray(entry.images) && entry.images.length && typeof entry.images[0] === "string") {
    return entry.images as string[];
  }
  const parsed = parseTripJackHotelImages(entry.rawImages ?? entry.images);
  return parsed.imageUrls;
}

export function applyParsedImagesToHotel(
  hotel: NormalizedHotel,
  parsed: ParsedTripJackHotelImages
): NormalizedHotel {
  if (!parsed.imageUrls.length) return hotel;
  return {
    ...hotel,
    images: parsed.rawImages.length ? parsed.rawImages : parsed.imageUrls,
    imageUrls: parsed.imageUrls,
    heroImage: parsed.heroImage,
    imageUrl: parsed.heroImage ?? parsed.imageUrls[0],
    imageCaption: parsed.imageCaption,
    staticContent: parsed.rawImages.length ? { images: parsed.rawImages } : hotel.staticContent,
  };
}
