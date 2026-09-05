/** Distinct hotel photo URLs for catalog display (Unsplash, production-safe). */

export const HOTEL_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
  "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80",
  "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&q=80",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&q=80",
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&q=80",
  "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80",
  "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80",
  "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=800&q=80",
  "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?w=800&q=80",
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&q=80",
  "https://images.unsplash.com/photo-1455587734955-081b22074882?w=800&q=80",
  "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?w=800&q=80",
  "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&q=80",
  "https://images.unsplash.com/photo-1595576508898-0ad5c879a061?w=800&q=80",
  "https://images.unsplash.com/photo-1602002418082-a4443e081dd1?w=800&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  "https://images.unsplash.com/photo-1584132915807-fd1f5fbc076f?w=800&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&q=80",
  "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&q=80",
  "https://images.unsplash.com/photo-1535827841776-24afc1e255ac?w=800&q=80",
] as const;

function hashKey(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/** True when the URL is a usable remote (Firestore / CDN) hotel photo. */
export function isRemoteHotelImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

/**
 * Local seed paths like `/images/hotels/slug/1.jpg` are not shipped in `public/`,
 * so treat them as missing and fall back to a stable unique remote set.
 */
export function isUsableHotelImageUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (isRemoteHotelImageUrl(trimmed)) return true;
  if (trimmed.startsWith("/images/hotels/")) return false;
  return trimmed.startsWith("/") || trimmed.startsWith("data:");
}

/** Stable unique fallback gallery for a hotel (by id/slug). */
export function getHotelFallbackImages(
  hotel: { id?: string; slug?: string; city?: string },
  count = 4
): string[] {
  const key = hotel.id || hotel.slug || hotel.city || "hotel";
  const start = hashKey(key) % HOTEL_IMAGE_POOL.length;
  const images: string[] = [];
  for (let i = 0; i < count; i += 1) {
    images.push(HOTEL_IMAGE_POOL[(start + i * 5) % HOTEL_IMAGE_POOL.length]!);
  }
  return images;
}

/**
 * Prefer real Firestore/CDN images; otherwise assign a distinct fallback set
 * so homepage cards never share the same placeholder photo.
 */
export function resolveHotelDisplayImages(hotel: {
  id?: string;
  slug?: string;
  city?: string;
  images?: string[];
}): string[] {
  const usable = (hotel.images ?? [])
    .map((url) => url.trim())
    .filter(isUsableHotelImageUrl);

  if (usable.length > 0) return usable;
  return getHotelFallbackImages(hotel);
}

/** Seed helper: unique remote gallery per hotel slug. */
export function buildSeedHotelImages(slug: string, count = 5): string[] {
  return getHotelFallbackImages({ slug, id: slug }, count);
}
