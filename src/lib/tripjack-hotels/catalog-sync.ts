import {
  buildDestinationIndexFromHotels,
  countActiveTripJackHotels,
  countContentSyncedTripJackHotels,
  getAllTripJackActiveHotelsForIndexRebuild,
  getNextContentSyncBatch,
  getNextLocationBackfillBatch,
  getNextMissingImageBackfillBatch,
  getTripJackHotelCatalogImageStats,
  getTripJackHotelCatalogMeta,
  enrichCatalogLocationBulkChunk,
  updateTripJackHotelCatalogMeta,
  upsertTripJackHotelCatalogEntries,
  upsertTripJackHotelDestinations,
} from "@/lib/tripjack-hotels/catalog-firestore";
import {
  enrichCatalogEntryLocation,
  formatFeaturedCardLocation,
} from "@/lib/tripjack-hotels/catalog-location";
import {
  MAX_HOTEL_CONTENT_BATCH,
  MAX_HOTEL_MAPPING_PAGE_SIZE,
  MAX_LISTING_HIDS,
  LOCATION_BACKFILL_CHUNK_SIZE,
  LOCATION_BACKFILL_MAX_PER_RUN,
  IMAGE_BACKFILL_MAX_PER_RUN,
} from "@/lib/tripjack-hotels/catalog-types";
import type { TripJackHotelSyncMode } from "@/lib/tripjack-hotels/catalog-types";
import {
  createTripJackHotelSyncLog,
  updateTripJackHotelSyncLog,
} from "@/lib/tripjack-hotels/ops-firestore";
import {
  extractHotelContentPayload,
  extractHotelMappingPayload,
  mappingRecordToCatalogEntry,
  normalizeStaticHotelRecord,
} from "@/lib/tripjack-hotels/normalize-static";
import {
  fetchTripJackHotelContent,
  fetchTripJackHotelMapping,
  TripJackHotelStaticApiError,
} from "@/lib/tripjack-hotels/static-client";

export interface TripJackHotelCatalogSyncResult {
  synced: boolean;
  syncLogId: string;
  pagesFetched: number;
  mappingPagesFetched: number;
  mappingIdsFound: number;
  contentBatchesCompleted: number;
  contentSuccessCount: number;
  contentFailedCount: number;
  failedHotelIds: string[];
  hotelsUpserted: number;
  deletedMarked: number;
  destinationsIndexed: number;
  lastSyncNext: string | null;
  message: string;
}

const MAX_MAPPING_PAGES = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

async function fetchAllHotelMappings(input: {
  countryName?: string;
  regionIds?: string[];
  startPage?: number;
  maxPages: number;
  onPage?: (progress: {
    page: number;
    mappingsOnPage: number;
    totalMappings: number;
  }) => Promise<void>;
}): Promise<{ mappings: ReturnType<typeof mappingRecordToCatalogEntry>[]; pagesFetched: number }> {
  const countryName = input.countryName ?? "INDIA";
  const mappings: ReturnType<typeof mappingRecordToCatalogEntry>[] = [];
  let page = input.startPage ?? 0;
  let pagesFetched = 0;

  while (pagesFetched < input.maxPages) {
    const body: Record<string, unknown> = {
      countryName,
      page,
      size: MAX_HOTEL_MAPPING_PAGE_SIZE,
    };
    if (input.regionIds?.length) {
      body.regionIds = input.regionIds;
    }

    const { data } = await fetchTripJackHotelMapping(body);
    const parsed = extractHotelMappingPayload(data, MAX_HOTEL_MAPPING_PAGE_SIZE);
    const pageEntries = parsed.mappings.map((mapping) =>
      mappingRecordToCatalogEntry(mapping, countryName)
    );
    mappings.push(...pageEntries);
    pagesFetched += 1;

    await input.onPage?.({
      page,
      mappingsOnPage: pageEntries.length,
      totalMappings: mappings.length,
    });

    if (!parsed.hasMore || pageEntries.length === 0) break;
    page += 1;
  }

  return { mappings, pagesFetched };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHotelContentWithRetry(
  batchIds: string[],
  maxRetries = 3
): Promise<{ data: unknown }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await fetchTripJackHotelContent({ hotelIds: batchIds });
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(1500 * attempt);
      }
    }
  }
  throw lastError;
}

async function syncHotelContentBatches(input: {
  hotelIds: number[];
  maxBatches?: number;
  onBatch?: (progress: {
    batchIndex: number;
    batchTotal: number;
    successCount: number;
    failedCount: number;
    failedIds: string[];
  }) => Promise<void>;
}): Promise<{
  contentBatchesCompleted: number;
  contentSuccessCount: number;
  contentFailedCount: number;
  failedHotelIds: string[];
  hotelsUpserted: number;
}> {
  const uniqueIds = [...new Set(input.hotelIds.filter((id) => Number.isFinite(id) && id > 0))];
  const batches = chunk(uniqueIds, MAX_HOTEL_CONTENT_BATCH);
  const limitedBatches =
    input.maxBatches && input.maxBatches > 0 ? batches.slice(0, input.maxBatches) : batches;

  let contentBatchesCompleted = 0;
  let contentSuccessCount = 0;
  let contentFailedCount = 0;
  let hotelsUpserted = 0;
  const failedHotelIds: string[] = [];

  for (let index = 0; index < limitedBatches.length; index += 1) {
    const batch = limitedBatches[index];
    const batchIds = batch.map(String);

    try {
      const { data } = await fetchHotelContentWithRetry(batchIds);
      const hotels = extractHotelContentPayload(data);
      const entries = hotels
        .map((hotel) => normalizeStaticHotelRecord(hotel))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      if (entries.length) {
        hotelsUpserted += await upsertTripJackHotelCatalogEntries(entries);
      }
      contentSuccessCount += entries.length;
      const missing = batch.length - entries.length;
      if (missing > 0) {
        contentFailedCount += missing;
        failedHotelIds.push(...batchIds.slice(entries.length));
      }
    } catch (error) {
      contentFailedCount += batch.length;
      failedHotelIds.push(...batchIds);
      console.warn("[tripjack-hotel-sync] content batch failed:", {
        batchIds,
        error: error instanceof Error ? error.message : error,
      });
    }

    contentBatchesCompleted += 1;
    await input.onBatch?.({
      batchIndex: index + 1,
      batchTotal: limitedBatches.length,
      successCount: contentSuccessCount,
      failedCount: contentFailedCount,
      failedIds: failedHotelIds.slice(-batch.length),
    });
  }

  return {
    contentBatchesCompleted,
    contentSuccessCount,
    contentFailedCount,
    failedHotelIds,
    hotelsUpserted,
  };
}

export interface TripJackChunkedSyncProgress {
  phase: "mapping" | "content" | "destinations" | "done";
  syncLogId: string;
  mappingPage?: number;
  totalMappingIds?: number;
  mappingHasMore?: boolean;
  contentBatch?: number;
  contentBatchTotal?: number;
  savedHotels?: number;
  failedHotels?: number;
  message: string;
}

export async function startTripJackCatalogSyncSession(options: {
  mode: TripJackHotelSyncMode;
  actorId?: string;
  actorEmail?: string;
}): Promise<{ syncLogId: string }> {
  const syncLogId = await createTripJackHotelSyncLog({
    mode: options.mode,
    startedAt: new Date().toISOString(),
    success: false,
    actorId: options.actorId ?? "system",
    actorEmail: options.actorEmail,
    pagesFetched: 0,
    hotelsUpserted: 0,
    deletedMarked: 0,
    destinationsIndexed: 0,
    nationalitiesSynced: 0,
    failedRecords: 0,
    lastSyncNext: null,
    mappingPagesFetched: 0,
    mappingIdsFound: 0,
    contentBatchesCompleted: 0,
    contentSuccessCount: 0,
    contentFailedCount: 0,
    failedHotelIds: [],
  });

  await updateTripJackHotelCatalogMeta({
    syncInProgress: true,
    lastMappingPage: -1,
    totalMappingIds: 0,
    contentBatchesCompleted: 0,
    contentSuccessCount: 0,
    contentFailedCount: 0,
    failedHotelIds: [],
    contentSyncCursor: null,
    mappingHasMore: true,
    lastSyncMessage: `Sync started (${options.mode})`,
  });

  return { syncLogId };
}

export async function syncTripJackHotelMappingPage(options: {
  page: number;
  countryName?: string;
  regionIds?: string[];
  syncLogId?: string;
  actorId?: string;
}): Promise<{
  page: number;
  mappingsOnPage: number;
  totalMappingIds: number;
  hasMore: boolean;
  hotelsUpserted: number;
  message: string;
}> {
  const countryName = options.countryName ?? "INDIA";
  const body: Record<string, unknown> = {
    countryName,
    page: options.page,
    size: MAX_HOTEL_MAPPING_PAGE_SIZE,
  };
  if (options.regionIds?.length) {
    body.regionIds = options.regionIds;
  }

  const { data } = await fetchTripJackHotelMapping(body);
  const parsed = extractHotelMappingPayload(data, MAX_HOTEL_MAPPING_PAGE_SIZE);
  const pageEntries = parsed.mappings.map((mapping) =>
    mappingRecordToCatalogEntry(mapping, countryName)
  );

  let hotelsUpserted = 0;
  if (pageEntries.length) {
    hotelsUpserted = await upsertTripJackHotelCatalogEntries(pageEntries);
  }

  const meta = await getTripJackHotelCatalogMeta();
  const totalMappingIds =
    options.page === 0
      ? pageEntries.length
      : (meta.totalMappingIds ?? 0) + pageEntries.length;

  const message = `Mapping page ${options.page} — ${pageEntries.length} IDs on page, ${totalMappingIds} total`;

  await updateTripJackHotelCatalogMeta({
    lastMappingPage: options.page,
    totalMappingIds,
    mappingHasMore: parsed.hasMore,
    lastSyncMessage: message,
  });

  if (options.syncLogId) {
    await updateTripJackHotelSyncLog(options.syncLogId, {
      mappingPagesFetched: options.page + 1,
      mappingIdsFound: totalMappingIds,
      hotelsUpserted: (meta.totalHotels ?? 0) + hotelsUpserted,
      pagesFetched: options.page + 1,
    });
  }

  return {
    page: options.page,
    mappingsOnPage: pageEntries.length,
    totalMappingIds,
    hasMore: parsed.hasMore && pageEntries.length > 0,
    hotelsUpserted,
    message,
  };
}

export async function syncTripJackHotelContentBatch(options: {
  syncLogId?: string;
  maxRetries?: number;
}): Promise<{
  batchIndex: number;
  batchSize: number;
  batchTotal: number;
  hasMore: boolean;
  batchSuccess: number;
  batchFailed: number;
  savedHotels: number;
  failedHotels: number;
  failedHotelIds: string[];
  message: string;
}> {
  const meta = await getTripJackHotelCatalogMeta();
  const cursor = meta.contentSyncCursor ?? null;
  const { ids, lastTjHotelId, hasMore } = await getNextContentSyncBatch(cursor, MAX_HOTEL_CONTENT_BATCH);

  const totalMappingIds = meta.totalMappingIds ?? 0;
  const batchTotal = Math.max(1, Math.ceil(totalMappingIds / MAX_HOTEL_CONTENT_BATCH));
  const batchIndex = (meta.contentBatchesCompleted ?? 0) + 1;

  if (!ids.length) {
    const message = "No hotels pending content sync";
    await updateTripJackHotelCatalogMeta({
      mappingHasMore: false,
      lastSyncMessage: message,
    });
    return {
      batchIndex,
      batchSize: 0,
      batchTotal,
      hasMore: false,
      batchSuccess: 0,
      batchFailed: 0,
      savedHotels: meta.contentSuccessCount ?? 0,
      failedHotels: meta.contentFailedCount ?? 0,
      failedHotelIds: [],
      message,
    };
  }

  const batchIds = ids.map(String);
  let batchSuccess = 0;
  let batchFailed = 0;
  let hotelsUpserted = 0;
  const failedIds: string[] = [];

  try {
    const { data } = await fetchHotelContentWithRetry(batchIds, options.maxRetries ?? 3);
    const hotels = extractHotelContentPayload(data);
    const entries = hotels
      .map((hotel) => normalizeStaticHotelRecord(hotel))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    if (entries.length) {
      hotelsUpserted = await upsertTripJackHotelCatalogEntries(entries);
    }
    batchSuccess = entries.length;
    const missing = ids.length - entries.length;
    if (missing > 0) {
      batchFailed = missing;
      failedIds.push(...batchIds.slice(entries.length));
    }
  } catch (error) {
    batchFailed = ids.length;
    failedIds.push(...batchIds);
    console.warn("[tripjack-hotel-sync] content batch failed after retries:", {
      batchIds,
      error: error instanceof Error ? error.message : error,
    });
  }

  const contentSuccessCount = (meta.contentSuccessCount ?? 0) + batchSuccess;
  const contentFailedCount = (meta.contentFailedCount ?? 0) + batchFailed;
  const failedHotelIds = [...(meta.failedHotelIds ?? []), ...failedIds].slice(0, 500);
  const message = `Content batch ${batchIndex}/${batchTotal} — ${batchSuccess} saved, ${batchFailed} failed`;

  await updateTripJackHotelCatalogMeta({
    contentBatchesCompleted: batchIndex,
    contentSuccessCount,
    contentFailedCount,
    failedHotelIds,
    contentSyncCursor: lastTjHotelId,
    lastSyncMessage: message,
  });

  if (options.syncLogId) {
    await updateTripJackHotelSyncLog(options.syncLogId, {
      contentBatchesCompleted: batchIndex,
      contentSuccessCount,
      contentFailedCount,
      failedHotelIds,
      failedRecords: contentFailedCount,
      hotelsUpserted: (meta.totalHotels ?? 0) + hotelsUpserted,
    });
  }

  return {
    batchIndex,
    batchSize: ids.length,
    batchTotal,
    hasMore: hasMore && ids.length > 0,
    batchSuccess,
    batchFailed,
    savedHotels: contentSuccessCount,
    failedHotels: contentFailedCount,
    failedHotelIds: failedIds,
    message,
  };
}

export async function syncCatalogLocationBackfillBatch(options?: {
  maxRetries?: number;
  maxHotels?: number;
}): Promise<{
  batchSize: number;
  batchSuccess: number;
  batchFailed: number;
  enrichScanned: number;
  enrichUpdated: number;
  apiBatches: number;
  hasMore: boolean;
  message: string;
}> {
  const budget = Math.min(
    LOCATION_BACKFILL_MAX_PER_RUN,
    Math.max(100, options?.maxHotels ?? LOCATION_BACKFILL_CHUNK_SIZE)
  );

  const enrichBudget = Math.min(budget, 10_000);
  const enrichResult = await enrichCatalogLocationBulkChunk(enrichBudget);

  let apiProcessed = 0;
  let apiSuccess = 0;
  let apiFailed = 0;
  let apiBatches = 0;
  let apiHasMore = true;
  const apiBudget = Math.max(0, budget - enrichResult.updated);

  while (apiProcessed < apiBudget && apiHasMore) {
    const meta = await getTripJackHotelCatalogMeta();
    const cursor = meta.locationBackfillCursor ?? null;
    const remaining = apiBudget - apiProcessed;
    const fetchSize = Math.min(MAX_HOTEL_CONTENT_BATCH, remaining);

    const { ids, lastTjHotelId, hasMore: scanHasMore } = await getNextLocationBackfillBatch(
      cursor,
      fetchSize
    );

    if (!ids.length) {
      apiHasMore = false;
      await updateTripJackHotelCatalogMeta({
        locationBackfillCursor: null,
      });
      break;
    }

    const batchIds = ids.map(String);
    try {
      const { data } = await fetchHotelContentWithRetry(batchIds, options?.maxRetries ?? 3);
      const hotels = extractHotelContentPayload(data);
      const entries = hotels
        .map((hotel) => normalizeStaticHotelRecord(hotel))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      if (entries.length) {
        await upsertTripJackHotelCatalogEntries(entries);
      }
      apiSuccess += entries.length;
      apiFailed += Math.max(0, ids.length - entries.length);
    } catch (error) {
      apiFailed += ids.length;
      console.warn("[tripjack-hotel-sync] location backfill API batch failed:", error);
    }

    apiProcessed += ids.length;
    apiBatches += 1;
    apiHasMore = scanHasMore;

    await updateTripJackHotelCatalogMeta({
      locationBackfillCursor: lastTjHotelId,
    });

    if (!scanHasMore) {
      await updateTripJackHotelCatalogMeta({ locationBackfillCursor: null });
      apiHasMore = false;
    }
  }

  const totalTouched = enrichResult.updated + apiSuccess;
  const hasMore = enrichResult.hasMore || apiHasMore;

  const message = [
    `Location backfill chunk`,
    `${enrichResult.updated.toLocaleString()} enriched from catalog`,
    `${apiSuccess.toLocaleString()} refreshed via content API`,
    apiFailed > 0 ? `${apiFailed.toLocaleString()} API failed` : null,
    hasMore ? "more remaining — run again or wait for orchestrator" : "catalog pass complete",
  ]
    .filter(Boolean)
    .join(" · ");

  await updateTripJackHotelCatalogMeta({ lastSyncMessage: message });

  return {
    batchSize: enrichResult.scanned + apiProcessed,
    batchSuccess: totalTouched,
    batchFailed: apiFailed,
    enrichScanned: enrichResult.scanned,
    enrichUpdated: enrichResult.updated,
    apiBatches,
    hasMore,
    message,
  };
}

/** Process up to LOCATION_BACKFILL_MAX_PER_RUN hotels in repeated internal chunks (long-running). */
export async function runCatalogLocationBackfillRun(options?: {
  maxHotels?: number;
  maxRetries?: number;
}): Promise<{
  totalProcessed: number;
  totalUpdated: number;
  totalFailed: number;
  chunks: number;
  hasMore: boolean;
  message: string;
}> {
  const target = Math.min(
    LOCATION_BACKFILL_MAX_PER_RUN,
    Math.max(LOCATION_BACKFILL_CHUNK_SIZE, options?.maxHotels ?? LOCATION_BACKFILL_MAX_PER_RUN)
  );

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let chunks = 0;
  let hasMore = true;

  while (totalUpdated < target && hasMore) {
    const remaining = target - totalUpdated;
    const chunk = await syncCatalogLocationBackfillBatch({
      maxRetries: options?.maxRetries,
      maxHotels: Math.min(LOCATION_BACKFILL_CHUNK_SIZE, remaining + 500),
    });

    chunks += 1;
    totalProcessed += chunk.batchSize;
    totalUpdated += chunk.batchSuccess;
    totalFailed += chunk.batchFailed;
    hasMore = chunk.hasMore;

    if (chunk.batchSuccess === 0 && chunk.enrichUpdated === 0) break;
  }

  const message = `Location backfill run — ${totalUpdated.toLocaleString()} hotel${
    totalUpdated === 1 ? "" : "s"
  } updated (${chunks} chunk${chunks === 1 ? "" : "s"})${
    hasMore ? " · more hotels remaining" : " · finished for this run"
  }`;

  await updateTripJackHotelCatalogMeta({ lastSyncMessage: message });

  return {
    totalProcessed,
    totalUpdated,
    totalFailed,
    chunks,
    hasMore,
    message,
  };
}

export async function syncCatalogImageBackfillBatch(options?: {
  maxRetries?: number;
  maxHotels?: number;
}): Promise<{
  batchSize: number;
  batchSuccess: number;
  batchFailed: number;
  apiBatches: number;
  hasMore: boolean;
  message: string;
}> {
  const budget = Math.min(
    IMAGE_BACKFILL_MAX_PER_RUN,
    Math.max(MAX_HOTEL_CONTENT_BATCH, options?.maxHotels ?? MAX_HOTEL_CONTENT_BATCH)
  );

  let apiProcessed = 0;
  let apiSuccess = 0;
  let apiFailed = 0;
  let apiBatches = 0;
  let apiHasMore = true;

  while (apiProcessed < budget && apiHasMore) {
    const meta = await getTripJackHotelCatalogMeta();
    const cursor = meta.imageBackfillCursor ?? null;
    const remaining = budget - apiProcessed;
    const fetchSize = Math.min(MAX_HOTEL_CONTENT_BATCH, remaining);

    const { ids, lastTjHotelId, hasMore: scanHasMore } = await getNextMissingImageBackfillBatch(
      cursor,
      fetchSize
    );

    if (!ids.length) {
      apiHasMore = false;
      await updateTripJackHotelCatalogMeta({ imageBackfillCursor: null });
      break;
    }

    const batchIds = ids.map(String);
    try {
      const { data } = await fetchHotelContentWithRetry(batchIds, options?.maxRetries ?? 3);
      const hotels = extractHotelContentPayload(data);
      const entries = hotels
        .map((hotel) => normalizeStaticHotelRecord(hotel))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      if (entries.length) {
        await upsertTripJackHotelCatalogEntries(entries);
      }
      apiSuccess += entries.length;
      apiFailed += Math.max(0, ids.length - entries.length);
    } catch (error) {
      apiFailed += ids.length;
      console.warn("[tripjack-hotel-sync] image backfill API batch failed:", error);
    }

    apiProcessed += ids.length;
    apiBatches += 1;
    apiHasMore = scanHasMore;

    await updateTripJackHotelCatalogMeta({
      imageBackfillCursor: lastTjHotelId,
    });

    if (!scanHasMore) {
      await updateTripJackHotelCatalogMeta({ imageBackfillCursor: null });
      apiHasMore = false;
    }
  }

  const hasMore = apiHasMore;
  const message = [
    `Image backfill chunk`,
    `${apiSuccess.toLocaleString()} refreshed via content API`,
    apiFailed > 0 ? `${apiFailed.toLocaleString()} API failed` : null,
    hasMore ? "more remaining — run again" : "no missing-image hotels found in scan",
  ]
    .filter(Boolean)
    .join(" · ");

  await updateTripJackHotelCatalogMeta({ lastSyncMessage: message });
  await getTripJackHotelCatalogImageStats({ force: true });

  return {
    batchSize: apiProcessed,
    batchSuccess: apiSuccess,
    batchFailed: apiFailed,
    apiBatches,
    hasMore,
    message,
  };
}

export async function runCatalogImageBackfillRun(options?: {
  maxHotels?: number;
  maxRetries?: number;
}): Promise<{
  totalProcessed: number;
  totalUpdated: number;
  totalFailed: number;
  chunks: number;
  hasMore: boolean;
  message: string;
}> {
  const target = Math.min(
    IMAGE_BACKFILL_MAX_PER_RUN,
    Math.max(MAX_HOTEL_CONTENT_BATCH, options?.maxHotels ?? IMAGE_BACKFILL_MAX_PER_RUN)
  );

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  let chunks = 0;
  let hasMore = true;

  while (totalUpdated < target && hasMore) {
    const remaining = target - totalUpdated;
    const chunk = await syncCatalogImageBackfillBatch({
      maxRetries: options?.maxRetries,
      maxHotels: Math.min(MAX_HOTEL_CONTENT_BATCH, remaining),
    });

    chunks += 1;
    totalProcessed += chunk.batchSize;
    totalUpdated += chunk.batchSuccess;
    totalFailed += chunk.batchFailed;
    hasMore = chunk.hasMore;

    if (chunk.batchSuccess === 0 && chunk.batchSize === 0) break;
  }

  const message = `Image backfill run — ${totalUpdated.toLocaleString()} hotel${
    totalUpdated === 1 ? "" : "s"
  } updated (${chunks} batch${chunks === 1 ? "" : "es"})${
    hasMore ? " · more hotels remaining" : " · finished for this run"
  }`;

  await updateTripJackHotelCatalogMeta({ lastSyncMessage: message });

  return {
    totalProcessed,
    totalUpdated,
    totalFailed,
    chunks,
    hasMore,
    message,
  };
}

export async function finalizeTripJackCatalogSync(options: {
  syncLogId: string;
  rebuildDestinations?: boolean;
  actorId?: string;
}): Promise<TripJackHotelCatalogSyncResult> {
  const started = Date.now();
  let destinationsIndexed = 0;

  if (options.rebuildDestinations !== false) {
    const activeHotels = await getAllTripJackActiveHotelsForIndexRebuild();
    const destinations = buildDestinationIndexFromHotels(
      activeHotels.filter((hotel) => {
        if (!hotel.contentSynced) return false;
        const enriched = enrichCatalogEntryLocation(hotel);
        return Boolean(formatFeaturedCardLocation(enriched));
      })
    );
    destinationsIndexed = await upsertTripJackHotelDestinations(destinations);
  }

  const activeCount = await countActiveTripJackHotels();
  const contentSyncedCount = await countContentSyncedTripJackHotels();
  const meta = await getTripJackHotelCatalogMeta();
  const now = new Date().toISOString();

  const message = [
    `Mapping: ${meta.totalMappingIds ?? 0} IDs`,
    `Content: ${meta.contentSuccessCount ?? 0} saved, ${meta.contentFailedCount ?? 0} failed`,
    destinationsIndexed ? `${destinationsIndexed} destinations indexed` : null,
    `${contentSyncedCount} hotels with content`,
  ]
    .filter(Boolean)
    .join(" · ");

  await updateTripJackHotelCatalogMeta({
    lastSyncedAt: now,
    totalHotels: activeCount,
    activeHotels: activeCount,
    syncInProgress: false,
    mappingHasMore: false,
    contentSyncCursor: null,
    lastSyncMessage: message,
  });

  await updateTripJackHotelSyncLog(options.syncLogId, {
    completedAt: now,
    success: true,
    destinationsIndexed,
    hotelsUpserted: activeCount,
    mappingIdsFound: meta.totalMappingIds ?? 0,
    contentBatchesCompleted: meta.contentBatchesCompleted ?? 0,
    contentSuccessCount: meta.contentSuccessCount ?? 0,
    contentFailedCount: meta.contentFailedCount ?? 0,
    failedHotelIds: meta.failedHotelIds ?? [],
    failedRecords: meta.contentFailedCount ?? 0,
    durationMs: Date.now() - started,
  });

  return {
    synced: true,
    syncLogId: options.syncLogId,
    pagesFetched: (meta.lastMappingPage ?? 0) + 1,
    mappingPagesFetched: (meta.lastMappingPage ?? 0) + 1,
    mappingIdsFound: meta.totalMappingIds ?? 0,
    contentBatchesCompleted: meta.contentBatchesCompleted ?? 0,
    contentSuccessCount: meta.contentSuccessCount ?? 0,
    contentFailedCount: meta.contentFailedCount ?? 0,
    failedHotelIds: meta.failedHotelIds ?? [],
    hotelsUpserted: activeCount,
    deletedMarked: 0,
    destinationsIndexed,
    lastSyncNext: null,
    message,
  };
}

export async function syncTripJackHotelCatalog(options?: {
  mode?: TripJackHotelSyncMode;
  maxMappingPages?: number;
  maxContentBatches?: number;
  startMappingPage?: number;
  countryName?: string;
  regionIds?: string[];
  rebuildDestinations?: boolean;
  actorId?: string;
  actorEmail?: string;
}): Promise<TripJackHotelCatalogSyncResult> {
  const mode = options?.mode ?? "full";
  const maxMappingPages = options?.maxMappingPages ?? MAX_MAPPING_PAGES;
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
    mappingPagesFetched: 0,
    mappingIdsFound: 0,
    contentBatchesCompleted: 0,
    contentSuccessCount: 0,
    contentFailedCount: 0,
    failedHotelIds: [],
  });

  let mappingPagesFetched = 0;
  let mappingIdsFound = 0;
  let contentBatchesCompleted = 0;
  let contentSuccessCount = 0;
  let contentFailedCount = 0;
  let failedHotelIds: string[] = [];
  let hotelsUpserted = 0;
  let destinationsIndexed = 0;
  let lastMappingPage = 0;

  await updateTripJackHotelCatalogMeta({ syncInProgress: true });

  try {
    let mappingEntries: ReturnType<typeof mappingRecordToCatalogEntry>[] = [];

    if (mode === "full" || mode === "incremental" || mode === "mapping_only") {
      const mappingResult = await fetchAllHotelMappings({
        countryName: options?.countryName,
        regionIds: options?.regionIds,
        startPage: options?.startMappingPage ?? 0,
        maxPages: mode === "incremental" ? Math.min(maxMappingPages, 5) : maxMappingPages,
        onPage: async ({ page, totalMappings }) => {
          lastMappingPage = page;
          mappingIdsFound = totalMappings;
          await updateTripJackHotelCatalogMeta({
            lastMappingPage: page,
            totalMappingIds: totalMappings,
            lastSyncMessage: `Mapping page ${page} — ${totalMappings} hotel IDs found`,
          });
        },
      });

      mappingEntries = mappingResult.mappings;
      mappingPagesFetched = mappingResult.pagesFetched;
      mappingIdsFound = mappingEntries.length;

      if (mappingEntries.length) {
        hotelsUpserted += await upsertTripJackHotelCatalogEntries(mappingEntries);
      }
    }

    if (mode === "full" || mode === "incremental" || mode === "content_only") {
      let contentIds = mappingEntries.map((entry) => entry.tjHotelId);

      if (mode === "content_only") {
        const activeHotels = await getAllTripJackActiveHotelsForIndexRebuild();
        contentIds = activeHotels
          .filter((hotel) => !hotel.contentSynced || !hotel.cityName)
          .map((hotel) => hotel.tjHotelId);
      }

      const defaultMaxBatches = mode === "incremental" ? 20 : 20;
      const contentResult = await syncHotelContentBatches({
        hotelIds: contentIds,
        maxBatches:
          options?.maxContentBatches && options.maxContentBatches > 0
            ? options.maxContentBatches
            : defaultMaxBatches,
        onBatch: async ({ batchIndex, batchTotal, successCount, failedCount }) => {
          contentBatchesCompleted = batchIndex;
          contentSuccessCount = successCount;
          contentFailedCount = failedCount;
          await updateTripJackHotelCatalogMeta({
            contentBatchesCompleted: batchIndex,
            contentSuccessCount: successCount,
            contentFailedCount: failedCount,
            lastSyncMessage: `Content batch ${batchIndex}/${batchTotal} — ${successCount} ok, ${failedCount} failed`,
          });
        },
      });

      contentBatchesCompleted = contentResult.contentBatchesCompleted;
      contentSuccessCount = contentResult.contentSuccessCount;
      contentFailedCount = contentResult.contentFailedCount;
      failedHotelIds = contentResult.failedHotelIds;
      hotelsUpserted += contentResult.hotelsUpserted;
    }

    if (
      (options?.rebuildDestinations !== false && mode !== "mapping_only") ||
      mode === "destinations_only"
    ) {
      const activeHotels = await getAllTripJackActiveHotelsForIndexRebuild();
      const destinations = buildDestinationIndexFromHotels(activeHotels);
      destinationsIndexed = await upsertTripJackHotelDestinations(destinations);
    }

    const activeHotels = await getAllTripJackActiveHotelsForIndexRebuild();
    const now = new Date().toISOString();
    const message = [
      `Mapping: ${mappingIdsFound} IDs across ${mappingPagesFetched} page(s)`,
      `Content: ${contentSuccessCount} ok, ${contentFailedCount} failed in ${contentBatchesCompleted} batch(es)`,
      destinationsIndexed ? `${destinationsIndexed} destinations indexed` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    await updateTripJackHotelCatalogMeta({
      lastSyncedAt: now,
      totalHotels: activeHotels.length,
      activeHotels: activeHotels.length,
      deletedHotels: 0,
      lastSyncNext: null,
      syncInProgress: false,
      failedSyncRecords: contentFailedCount,
      lastMappingPage,
      totalMappingIds: mappingIdsFound,
      contentBatchesCompleted,
      contentSuccessCount,
      contentFailedCount,
      failedHotelIds: failedHotelIds.slice(0, 200),
      lastSyncMessage: message,
    });

    await updateTripJackHotelSyncLog(syncLogId, {
      completedAt: now,
      success: true,
      pagesFetched: mappingPagesFetched,
      mappingPagesFetched,
      mappingIdsFound,
      contentBatchesCompleted,
      contentSuccessCount,
      contentFailedCount,
      failedHotelIds: failedHotelIds.slice(0, 200),
      hotelsUpserted,
      deletedMarked: 0,
      destinationsIndexed,
      failedRecords: contentFailedCount,
      durationMs: Date.now() - started,
    });

    return {
      synced: true,
      syncLogId,
      pagesFetched: mappingPagesFetched,
      mappingPagesFetched,
      mappingIdsFound,
      contentBatchesCompleted,
      contentSuccessCount,
      contentFailedCount,
      failedHotelIds: failedHotelIds.slice(0, 200),
      hotelsUpserted,
      deletedMarked: 0,
      destinationsIndexed,
      lastSyncNext: null,
      message,
    };
  } catch (error) {
    await updateTripJackHotelCatalogMeta({
      syncInProgress: false,
      lastSyncMessage: error instanceof Error ? error.message : "Sync failed",
    });
    const message = error instanceof Error ? error.message : "Sync failed";
    await updateTripJackHotelSyncLog(syncLogId, {
      completedAt: new Date().toISOString(),
      success: false,
      errorMessage: message,
      pagesFetched: mappingPagesFetched,
      mappingPagesFetched,
      mappingIdsFound,
      contentBatchesCompleted,
      contentSuccessCount,
      contentFailedCount,
      failedHotelIds: failedHotelIds.slice(0, 200),
      hotelsUpserted,
      failedRecords: contentFailedCount,
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
