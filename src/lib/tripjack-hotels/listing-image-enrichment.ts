import "server-only";

import {
  getTripJackHotelCatalogEntryByHid,
  upsertTripJackHotelCatalogEntries,
} from "@/lib/tripjack-hotels/catalog-firestore";
import {
  applyParsedImagesToHotel,
  catalogEntryImageUrls,
  parseTripJackHotelImages,
  resolveHotelCardImageUrl,
} from "@/lib/tripjack-hotels/hotel-images";
import {
  extractHotelContentPayload,
  normalizeStaticHotelRecord,
} from "@/lib/tripjack-hotels/normalize-static";
import { fetchTripJackHotelContent } from "@/lib/tripjack-hotels/static-client";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";

/** Fetch TripJack V3 hotel content for listing cards missing images (max 100 IDs). */
async function fetchContentImagesForHids(
  hids: number[]
): Promise<Map<number, ReturnType<typeof parseTripJackHotelImages>>> {
  const map = new Map<number, ReturnType<typeof parseTripJackHotelImages>>();
  if (!hids.length) return map;

  const { data } = await fetchTripJackHotelContent({
    hotelIds: hids.map(String),
  });

  const contentHotels = extractHotelContentPayload(data);
  const catalogEntries = [];

  for (const raw of contentHotels) {
    const entry = normalizeStaticHotelRecord(raw);
    if (!entry?.imageUrls?.length) continue;
    const parsed = parseTripJackHotelImages(entry.images, entry.imageUrls);
    map.set(entry.tjHotelId, {
      rawImages: entry.images ?? parsed.rawImages,
      imageUrls: entry.imageUrls,
      heroImage: entry.heroImage ?? parsed.heroImage,
      imageCaption: entry.imageCaption ?? parsed.imageCaption,
    });
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
        const parsed = liveImages.get(Number(hotel.tjHotelId));
        return parsed?.imageUrls.length ? applyParsedImagesToHotel(hotel, parsed) : hotel;
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
      if (!catalog) return { tjHotelId: Number(hotel.tjHotelId), parsed: null };
      const urls = catalogEntryImageUrls(catalog);
      const parsed = parseTripJackHotelImages(catalog.images, urls);
      return {
        tjHotelId: Number(hotel.tjHotelId),
        parsed: urls.length
          ? {
              rawImages: catalog.images ?? parsed.rawImages,
              imageUrls: urls,
              heroImage: catalog.heroImage ?? parsed.heroImage,
              imageCaption: catalog.imageCaption ?? parsed.imageCaption,
            }
          : null,
      };
    })
  );

  const catalogMap = new Map(
    catalogResults
      .filter((row) => row.parsed?.imageUrls.length)
      .map((row) => [row.tjHotelId, row.parsed!] as const)
  );

  return enriched.map((hotel) => {
    const parsed = catalogMap.get(Number(hotel.tjHotelId));
    return parsed ? applyParsedImagesToHotel(hotel, parsed) : hotel;
  });
}
