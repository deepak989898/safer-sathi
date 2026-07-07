import "server-only";

import { getTripJackHotelCatalogEntryByHid } from "@/lib/tripjack-hotels/catalog-firestore";
import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";
import {
  catalogEntryToEnrichment,
  staticContentToEnrichment,
  type HotelCatalogEnrichment,
} from "@/lib/tripjack-hotels/detail-content";
import {
  extractHotelContentPayload,
  normalizeStaticHotelRecord,
} from "@/lib/tripjack-hotels/normalize-static";
import { fetchTripJackHotelContent } from "@/lib/tripjack-hotels/static-client";

function needsContentRefresh(entry: TripJackHotelCatalogEntry | null): boolean {
  if (!entry) return true;
  if (!entry.contentSynced) return true;
  if (!entry.description?.trim() && !entry.facilities.length) return true;
  return false;
}

export async function resolveHotelStaticEnrichment(
  hid: string | number
): Promise<{
  enrichment?: HotelCatalogEnrichment;
  catalog: TripJackHotelCatalogEntry | null;
  source: "catalog" | "live-content" | "none";
}> {
  const catalog = await getTripJackHotelCatalogEntryByHid(hid);

  if (catalog && !needsContentRefresh(catalog)) {
    return {
      enrichment: catalogEntryToEnrichment(catalog),
      catalog,
      source: "catalog",
    };
  }

  try {
    const hidStr = String(hid).replace(/\D/g, "") || String(hid);
    const { data } = await fetchTripJackHotelContent({ hotelIds: [hidStr] });
    const hotels = extractHotelContentPayload(data);
    const rawHotel = hotels[0];
    const normalized = rawHotel ? normalizeStaticHotelRecord(rawHotel) : null;
    const enrichment = staticContentToEnrichment(normalized ?? catalog, rawHotel);

    if (enrichment) {
      return {
        enrichment,
        catalog: normalized ?? catalog,
        source: "live-content",
      };
    }
  } catch (error) {
    console.warn(
      "[tripjack-hotels] static content fallback failed",
      hid,
      error instanceof Error ? error.message : error
    );
  }

  if (catalog) {
    return {
      enrichment: catalogEntryToEnrichment(catalog),
      catalog,
      source: "catalog",
    };
  }

  return { enrichment: undefined, catalog: null, source: "none" };
}
