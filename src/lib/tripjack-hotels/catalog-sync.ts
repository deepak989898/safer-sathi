import {
  buildDestinationIndexFromHotels,
  getAllTripJackActiveHotelsForIndexRebuild,
  updateTripJackHotelCatalogMeta,
  upsertTripJackHotelCatalogEntries,
  upsertTripJackHotelDestinations,
} from "@/lib/tripjack-hotels/catalog-firestore";
import { MAX_LISTING_HIDS } from "@/lib/tripjack-hotels/catalog-types";
import type { TripJackHotelSyncMode } from "@/lib/tripjack-hotels/catalog-types";
import {
  createTripJackHotelSyncLog,
  updateTripJackHotelSyncLog,
} from "@/lib/tripjack-hotels/ops-firestore";
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
  syncLogId: string;
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
  mode?: TripJackHotelSyncMode;
  maxPages?: number;
  startSyncNext?: string | null;
  rebuildDestinations?: boolean;
  actorId?: string;
  actorEmail?: string;
}): Promise<TripJackHotelCatalogSyncResult> {
  const mode = options?.mode ?? "full";
  const maxPages = options?.maxPages ?? MAX_SYNC_PAGES;
  const started = Date.now();
  const syncLogId = await createTripJackHotelSyncLog({
    mode,
    startedAt: new Date().toISOString(),
    success: false,
    actorId: options?.actorId ?? "system",
    actorEmail: options?.actorEmail,
    pagesFetched: 0,
    hotelsUpserted: 0,
    deletedMarked: 0,
    destinationsIndexed: 0,
    nationalitiesSynced: 0,
    failedRecords: 0,
    lastSyncNext: null,
  });

  let syncNext = options?.startSyncNext ?? null;
  let pagesFetched = 0;
  let hotelsUpserted = 0;
  let deletedMarked = 0;
  let failedRecords = 0;

  await updateTripJackHotelCatalogMeta({ syncInProgress: true });

  try {
    if (mode === "full" || mode === "incremental") {
      while (pagesFetched < maxPages) {
        const { entries, next } = await syncStaticHotelsPage(syncNext, false);
        pagesFetched += 1;

        if (entries.length) {
          try {
            hotelsUpserted += await upsertTripJackHotelCatalogEntries(
              entries.filter((e): e is NonNullable<typeof e> => Boolean(e))
            );
          } catch {
            failedRecords += entries.length;
          }
        }

        syncNext = next;
        if (!syncNext) break;
        if (mode === "incremental" && pagesFetched >= 5) break;
      }
    }

    if (mode === "full" || mode === "deleted_only") {
      let deletedSyncNext: string | null = null;
      let deletedPages = 0;
      while (deletedPages < 10) {
        const { entries, next } = await syncStaticHotelsPage(deletedSyncNext, true);
        deletedPages += 1;
        if (entries.length) {
          const deletedEntries = entries.map((entry) => ({ ...entry!, isDeleted: true }));
          deletedMarked += await upsertTripJackHotelCatalogEntries(deletedEntries);
        }
        deletedSyncNext = next;
        if (!deletedSyncNext) break;
      }
    }

    let destinationsIndexed = 0;
    if (
      (options?.rebuildDestinations !== false && mode !== "deleted_only") ||
      mode === "destinations_only"
    ) {
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
      failedSyncRecords: failedRecords,
    });

    const message =
      hotelsUpserted > 0
        ? `Synced ${hotelsUpserted} hotel(s) across ${pagesFetched} page(s)`
        : mode === "deleted_only"
          ? `Marked ${deletedMarked} deleted hotel(s)`
          : "Sync completed — verify VPS static routes if zero hotels returned";

    await updateTripJackHotelSyncLog(syncLogId, {
      completedAt: now,
      success: true,
      pagesFetched,
      hotelsUpserted,
      deletedMarked,
      destinationsIndexed,
      failedRecords,
      lastSyncNext: syncNext,
      durationMs: Date.now() - started,
    });

    return {
      synced: true,
      syncLogId,
      pagesFetched,
      hotelsUpserted,
      deletedMarked,
      destinationsIndexed,
      lastSyncNext: syncNext,
      message,
    };
  } catch (error) {
    await updateTripJackHotelCatalogMeta({ syncInProgress: false });
    const message = error instanceof Error ? error.message : "Sync failed";
    await updateTripJackHotelSyncLog(syncLogId, {
      completedAt: new Date().toISOString(),
      success: false,
      errorMessage: message,
      pagesFetched,
      hotelsUpserted,
      deletedMarked,
      failedRecords,
      durationMs: Date.now() - started,
    });
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
