import type { NormalizedHotel, NormalizedHotelOption } from "@/lib/tripjack-hotels/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickUrlFromUnknown(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("//")) {
      return trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
    }
  }
  const rec = asRecord(value);
  if (!rec) return "";
  const keys = ["url", "imageUrl", "link", "path", "src", "href", "image"];
  for (const key of keys) {
    const candidate = rec[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return pickUrlFromUnknown(candidate);
    }
  }
  return "";
}

/** Extract image URLs from TripJack arrays (strings or { url, sz } objects). */
export function extractImageUrlList(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string" && value.trim()) {
    return [pickUrlFromUnknown(value)].filter(Boolean);
  }
  if (!Array.isArray(value)) {
    return [pickUrlFromUnknown(value)].filter(Boolean);
  }

  const urls: string[] = [];
  for (const item of value) {
    const url = pickUrlFromUnknown(item);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

export function resolveHotelImageCandidates(input: {
  imageUrl?: string;
  images?: string[];
  imageUrls?: string[];
  heroImage?: string;
  staticContent?: { images?: unknown };
  options?: NormalizedHotelOption[];
}): string[] {
  const candidates: string[] = [];

  const push = (value: unknown) => {
    for (const url of extractImageUrlList(value)) {
      if (!candidates.includes(url)) candidates.push(url);
    }
    if (typeof value === "string" && value.trim()) {
      const url = pickUrlFromUnknown(value);
      if (url && !candidates.includes(url)) candidates.push(url);
    }
  };

  push(input.imageUrl);
  push(input.images);
  push(input.imageUrls);
  push(input.heroImage);
  push(input.staticContent?.images);

  for (const option of input.options ?? []) {
    push(option.roomImages);
  }

  return candidates.filter((url) => url.startsWith("http"));
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
