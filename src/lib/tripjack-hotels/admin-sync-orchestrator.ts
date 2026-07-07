import { tripjackAdminApiCall } from "@/lib/tripjack-hotels/admin-response";

export interface TripJackSyncProgress {
  phase: "starting" | "mapping" | "content" | "destinations" | "done" | "error";
  mappingPage: number;
  totalMappingIds: number;
  mappingHasMore: boolean;
  contentBatch: number;
  contentBatchTotal: number;
  savedHotels: number;
  failedHotels: number;
  message: string;
}

export interface TripJackOrchestratedSyncResult {
  ok: boolean;
  message: string;
  error?: string;
}

interface SyncStepData {
  syncLogId?: string;
  message?: string;
  hasMore?: boolean;
  totalMappingIds?: number;
  page?: number;
  batchIndex?: number;
  batchTotal?: number;
  batchSize?: number;
  savedHotels?: number;
  failedHotels?: number;
  meta?: {
    totalMappingIds?: number;
    contentSuccessCount?: number;
    contentFailedCount?: number;
    activeHotels?: number;
    lastSyncedAt?: string | null;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const INITIAL_PROGRESS: TripJackSyncProgress = {
  phase: "starting",
  mappingPage: 0,
  totalMappingIds: 0,
  mappingHasMore: true,
  contentBatch: 0,
  contentBatchTotal: 0,
  savedHotels: 0,
  failedHotels: 0,
  message: "Starting sync…",
};

function buildUrl(mode: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams({ mode });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  return `/api/admin/tripjack-hotels/sync?${search.toString()}`;
}

async function syncStep(
  mode: string,
  params: Record<string, string | number | undefined>,
  context: string
): Promise<{ ok: boolean; data?: SyncStepData; error?: string }> {
  const result = await tripjackAdminApiCall<SyncStepData>(
    buildUrl(mode, params),
    { method: "POST" },
    context
  );
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Sync step failed" };
  }
  return { ok: true, data: result.data };
}

export async function orchestrateTripJackSync(
  mode: "full" | "mapping_only" | "content_only" | "incremental",
  onProgress: (progress: TripJackSyncProgress) => void,
  options?: { maxMappingPages?: number; maxContentBatches?: number }
): Promise<TripJackOrchestratedSyncResult> {
  const maxMappingPages =
    options?.maxMappingPages ?? (mode === "incremental" ? 5 : 100);
  const maxContentBatches =
    options?.maxContentBatches ?? (mode === "incremental" ? 20 : undefined);

  let progress = { ...INITIAL_PROGRESS };
  onProgress(progress);

  const underlyingMode = mode === "incremental" ? "incremental" : mode;
  const start = await syncStep(
    "sync_start",
    { underlyingMode },
    "Start sync session"
  );
  if (!start.ok || !start.data?.syncLogId) {
    progress = { ...progress, phase: "error", message: start.error ?? "Failed to start sync" };
    onProgress(progress);
    return { ok: false, message: progress.message, error: start.error };
  }

  const syncLogId = start.data.syncLogId;

  if (mode === "full" || mode === "mapping_only" || mode === "incremental") {
    let page = 0;
    let mappingHasMore = true;

    while (mappingHasMore && page < maxMappingPages) {
      const step = await syncStep(
        "mapping_page",
        { page, syncLogId },
        `Mapping page ${page}`
      );
      if (!step.ok) {
        progress = { ...progress, phase: "error", message: step.error ?? "Mapping failed" };
        onProgress(progress);
        return { ok: false, message: progress.message, error: step.error };
      }

      const totalMappingIds = step.data?.totalMappingIds ?? progress.totalMappingIds;
      mappingHasMore = Boolean(step.data?.hasMore);
      progress = {
        ...progress,
        phase: "mapping",
        mappingPage: page,
        totalMappingIds,
        mappingHasMore,
        contentBatchTotal: Math.max(1, Math.ceil(totalMappingIds / 100)),
        message: step.data?.message ?? `Mapping page ${page}`,
      };
      onProgress(progress);
      page += 1;

      if (!mappingHasMore || step.data?.hasMore === false) break;

      await sleep(100);
    }
  }

  if (mode === "full" || mode === "content_only" || mode === "incremental") {
    let contentHasMore = true;
    let batchesDone = 0;

    while (contentHasMore) {
      if (maxContentBatches && batchesDone >= maxContentBatches) break;

      const step = await syncStep(
        "content_batch",
        { syncLogId },
        `Content batch ${batchesDone + 1}`
      );
      if (!step.ok) {
        progress = {
          ...progress,
          phase: "error",
          message: step.error ?? "Content batch failed",
          failedHotels: progress.failedHotels + 1,
        };
        onProgress(progress);
        // Continue with next batch instead of aborting entire sync
        batchesDone += 1;
        if (batchesDone > (progress.contentBatchTotal || 1) + 5) break;
        continue;
      }

      contentHasMore = Boolean(step.data?.hasMore);
      batchesDone += 1;
      progress = {
        ...progress,
        phase: "content",
        contentBatch: step.data?.batchIndex ?? batchesDone,
        contentBatchTotal: step.data?.batchTotal ?? progress.contentBatchTotal,
        savedHotels: step.data?.savedHotels ?? progress.savedHotels,
        failedHotels: step.data?.failedHotels ?? progress.failedHotels,
        message: step.data?.message ?? `Content batch ${batchesDone}`,
      };
      onProgress(progress);

      if (!step.data?.batchSize && !step.data?.hasMore) break;

      await sleep(150);
    }
  }

  if (mode === "full" || mode === "content_only" || mode === "incremental") {
    progress = { ...progress, phase: "destinations", message: "Rebuilding destination index…" };
    onProgress(progress);
  }

  const finalize = await syncStep(
    "sync_finalize",
    { syncLogId, rebuildDestinations: mode === "mapping_only" ? "0" : "1" },
    "Finalize sync"
  );
  if (!finalize.ok) {
    progress = { ...progress, phase: "error", message: finalize.error ?? "Finalize failed" };
    onProgress(progress);
    return { ok: false, message: progress.message, error: finalize.error };
  }

  const message = finalize.data?.message ?? "Sync completed";
  progress = {
    ...progress,
    phase: "done",
    savedHotels: finalize.data?.meta?.contentSuccessCount ?? progress.savedHotels,
    failedHotels: finalize.data?.meta?.contentFailedCount ?? progress.failedHotels,
    totalMappingIds: finalize.data?.meta?.totalMappingIds ?? progress.totalMappingIds,
    message,
  };
  onProgress(progress);

  return { ok: true, message };
}
