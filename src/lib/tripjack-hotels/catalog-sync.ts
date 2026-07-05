import {
  buildDestinationIndexFromHotels,
  getAllTripJackActiveHotelsForIndexRebuild,
  updateTripJackHotelCatalogMeta,
  upsertTripJackHotelCatalogEntries,
  upsertTripJackHotelDestinations,
} from "@/lib/tripjack-hotels/catalog-firestore";
import { MAX_LISTING_HIDS } from "@/lib/tripjack-hotels/catalog-types";
import {
  extractStaticHotelsPayload,
  normalizeStaticHotelRecord,
} from "@/lib/tripjack-hotels/normalize-static";
import {
  fetchTripJackDeletedStaticHotels,
  fetchTripJackStaticHotels,
  TripJackHotelStaticApiError,
} from "@/lib/tripjack-hotels/static-client";

export interface TripJackHotelCatalogSyncResult {
  synced: boolean;
  pagesFetched: number;
  hotelsUpserted: number;
  deletedMarked: number;
  destinationsIndexed: number;
  lastSyncNext: string | null;
  message: string;
}

const MAX_SYNC_PAGES = 50;

async function syncStaticHotelsPage(
  syncNext: string | null,
  markDeleted: boolean
): Promise<{ entries: ReturnType<typeof normalizeStaticHotelRecord>[]; next: string | null }> {
  const fetcher = markDeleted ? fetchTripJackDeletedStaticHotels : fetchTripJackStaticHotels;
  const { data } = await fetcher(syncNext);
  const { hotels, syncNext: next } = extractStaticHotelsPayload(data);

  const entries = hotels
    .map((hotel) => normalizeStaticHotelRecord(hotel, { isDeleted: markDeleted }))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return { entries, next };
}

export async function syncTripJackHotelCatalog(options?: {
  maxPages?: number;
  startSyncNext?: string | null;
  rebuildDestinations?: boolean;
}): Promise<TripJackHotelCatalogSyncResult> {
  const maxPages = options?.maxPages ?? MAX_SYNC_PAGES;
  let syncNext = options?.startSyncNext ?? null;
  let pagesFetched = 0;
  let hotelsUpserted = 0;
  let deletedMarked = 0;

  await updateTripJackHotelCatalogMeta({ syncInProgress: true });

  try {
    while (pagesFetched < maxPages) {
      const { entries, next } = await syncStaticHotelsPage(syncNext, false);
      pagesFetched += 1;

      if (entries.length) {
        const normalized = entries.filter(
          (entry): entry is NonNullable<typeof entry> => Boolean(entry)
        );
        hotelsUpserted += await upsertTripJackHotelCatalogEntries(normalized);
      }

      syncNext = next;
      if (!syncNext) break;
    }

    let deletedSyncNext: string | null = null;
    let deletedPages = 0;
    while (deletedPages < 10) {
      const { entries, next } = await syncStaticHotelsPage(deletedSyncNext, true);
      deletedPages += 1;
      if (entries.length) {
        const deletedEntries = entries.map((entry) => ({
          ...entry!,
          isDeleted: true,
        }));
        deletedMarked += await upsertTripJackHotelCatalogEntries(deletedEntries);
      }
      deletedSyncNext = next;
      if (!deletedSyncNext) break;
    }

    let destinationsIndexed = 0;
    if (options?.rebuildDestinations !== false) {
      const activeHotels = await getAllTripJackActiveHotelsForIndexRebuild();
      const destinations = buildDestinationIndexFromHotels(activeHotels);
      destinationsIndexed = await upsertTripJackHotelDestinations(destinations);
    }

    const activeHotels = await getAllTripJackActiveHotelsForIndexRebuild();
    const now = new Date().toISOString();

    await updateTripJackHotelCatalogMeta({
      lastSyncedAt: now,
      totalHotels: activeHotels.length + deletedMarked,
      activeHotels: activeHotels.length,
      deletedHotels: deletedMarked,
      lastSyncNext: syncNext,
      syncInProgress: false,
    });

    return {
      synced: true,
      pagesFetched,
      hotelsUpserted,
      deletedMarked,
      destinationsIndexed,
      lastSyncNext: syncNext,
      message:
        hotelsUpserted > 0
          ? `Synced ${hotelsUpserted} hotel(s) across ${pagesFetched} page(s)`
          : "Sync completed but no hotels returned — check VPS static routes and TripJack credentials",
    };
  } catch (error) {
    await updateTripJackHotelCatalogMeta({ syncInProgress: false });
    if (error instanceof TripJackHotelStaticApiError) throw error;
    throw error;
  }
}

export function capHidsForListing(hids: number[]): { hids: number[]; truncated: boolean } {
  const unique = [...new Set(hids.filter((id) => Number.isFinite(id) && id > 0))];
  if (unique.length <= MAX_LISTING_HIDS) {
    return { hids: unique, truncated: false };
  }
  return { hids: unique.slice(0, MAX_LISTING_HIDS), truncated: true };
}
