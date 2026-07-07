import "server-only";

import {
  getTripJackHotelCatalogEntryByHid,
  upsertTripJackHotelCatalogEntries,
} from "@/lib/tripjack-hotels/catalog-firestore";
import { resolveHotelCardImageUrl } from "@/lib/tripjack-hotels/hotel-images";
import {
  extractHotelContentPayload,
  normalizeStaticHotelRecord,
} from "@/lib/tripjack-hotels/normalize-static";
import { fetchTripJackHotelContent } from "@/lib/tripjack-hotels/static-client";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";

function mergeHotelImages(
  hotel: NormalizedHotel,
  images: string[]
): NormalizedHotel {
  if (!images.length) return hotel;
  return {
    ...hotel,
    images,
    imageUrls: images,
    imageUrl: images[0],
    staticContent: { images },
  };
}

/** Fetch TripJack V3 hotel content for listing cards missing images (max 100 IDs). */
async function fetchContentImagesForHids(
  hids: number[]
): Promise<Map<number, string[]>> {
  const map = new Map<number, string[]>();
  if (!hids.length) return map;

  const { data } = await fetchTripJackHotelContent({
    hotelIds: hids.map(String),
  });

  const contentHotels = extractHotelContentPayload(data);
  const catalogEntries = [];

  for (const raw of contentHotels) {
    const entry = normalizeStaticHotelRecord(raw);
    if (!entry?.images?.length) continue;
    map.set(entry.tjHotelId, entry.images);
    if (entry.contentSynced) {
      catalogEntries.push(entry);
    }
  }

  if (catalogEntries.length) {
    void upsertTripJackHotelCatalogEntries(catalogEntries).catch((error) => {
      console.warn("[hotel-listing] failed to cache content images:", error);
    });
  }

  return map;
}

/**
 * Attach images to listing hotels:
 * 1) live TripJack content API for visible result HIDs
 * 2) Firestore catalog fallback
 */
export async function enrichListingHotelsWithImages(
  hotels: NormalizedHotel[]
): Promise<NormalizedHotel[]> {
  if (!hotels.length) return hotels;

  let enriched = [...hotels];
  const missing = enriched.filter((hotel) => !resolveHotelCardImageUrl(hotel));

  if (missing.length) {
    const hids = [
      ...new Set(
        missing
          .map((hotel) => Number(hotel.tjHotelId))
          .filter((id) => Number.isFinite(id) && id > 0)
      ),
    ].slice(0, 100);

    try {
      const liveImages = await fetchContentImagesForHids(hids);
      enriched = enriched.map((hotel) => {
        const images = liveImages.get(Number(hotel.tjHotelId));
        return images?.length ? mergeHotelImages(hotel, images) : hotel;
      });
    } catch (error) {
      console.warn("[hotel-listing] live content image fetch failed:", error);
    }
  }

  const stillMissing = enriched.filter((hotel) => !resolveHotelCardImageUrl(hotel));
  if (!stillMissing.length) return enriched;

  const catalogResults = await Promise.all(
    stillMissing.map(async (hotel) => {
      const catalog = await getTripJackHotelCatalogEntryByHid(hotel.tjHotelId);
      return { tjHotelId: Number(hotel.tjHotelId), images: catalog?.images ?? [] };
    })
  );

  const catalogMap = new Map(
    catalogResults
      .filter((row) => row.images.length > 0)
      .map((row) => [row.tjHotelId, row.images] as const)
  );

  return enriched.map((hotel) => {
    const images = catalogMap.get(Number(hotel.tjHotelId));
    return images?.length ? mergeHotelImages(hotel, images) : hotel;
  });
}
