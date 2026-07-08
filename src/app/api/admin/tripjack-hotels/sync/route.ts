import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { syncRecentHotelBookingStatuses } from "@/lib/tripjack-hotels/booking-status-sync";
import {
  finalizeTripJackCatalogSync,
  runCatalogImageBackfillRun,
  runCatalogLocationBackfillRun,
  startTripJackCatalogSyncSession,
  syncCatalogImageBackfillBatch,
  syncCatalogLocationBackfillBatch,
  syncTripJackHotelCatalog,
  syncTripJackHotelContentBatch,
  syncTripJackHotelMappingPage,
} from "@/lib/tripjack-hotels/catalog-sync";
import type { TripJackHotelSyncMode } from "@/lib/tripjack-hotels/catalog-types";
import {
  IMAGE_BACKFILL_MAX_PER_RUN,
  LOCATION_BACKFILL_CHUNK_SIZE,
  LOCATION_BACKFILL_MAX_PER_RUN,
  MAX_HOTEL_CONTENT_BATCH,
} from "@/lib/tripjack-hotels/catalog-types";
import { getTripJackHotelCatalogMeta } from "@/lib/tripjack-hotels/catalog-firestore";
import { syncTripJackHotelNationalities } from "@/lib/tripjack-hotels/nationalities-sync";
import { listTripJackHotelSyncLogs } from "@/lib/tripjack-hotels/ops-firestore";
import { TripJackHotelStaticApiError } from "@/lib/tripjack-hotels/static-client";
import {
  isTripJackStaticCatalogue403,
  TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE,
} from "@/lib/tripjack-hotels/messages";

export const maxDuration = 300;

function staticApiErrorResponse(error: TripJackHotelStaticApiError) {
  const staticCatalogue403 = isTripJackStaticCatalogue403({
    upstreamStatus: error.upstreamStatus,
    proxyRouteOk:
      error.raw && typeof error.raw === "object"
        ? (error.raw as Record<string, unknown>).proxyRouteOk === true
        : error.upstreamStatus === 403,
  });
  return apiError(
    staticCatalogue403 ? TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE : error.message,
    error.statusCode ?? 502,
    {
      upstreamUrl: error.upstreamUrl,
      upstreamStatus: error.upstreamStatus,
      rawPreview: error.rawPreview,
      raw: error.raw,
      proxyRouteOk: staticCatalogue403,
      adminMessage: staticCatalogue403
        ? TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE
        : undefined,
      bookingFlowUnblocked: staticCatalogue403,
    }
  );
}

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const mode = (url.searchParams.get("mode") ?? "full") as TripJackHotelSyncMode;
    const syncLogId = url.searchParams.get("syncLogId") ?? undefined;
    const underlyingMode = (url.searchParams.get("underlyingMode") ?? "full") as TripJackHotelSyncMode;

    if (mode === "nationalities") {
      const result = await syncTripJackHotelNationalities({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
      });
      const meta = await getTripJackHotelCatalogMeta();
      return apiSuccess({ ...result, meta, mode });
    }

    if (mode === "booking_status") {
      const result = await syncRecentHotelBookingStatuses({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        limit: Number(url.searchParams.get("limit") ?? "50"),
      });
      const meta = await getTripJackHotelCatalogMeta();
      return apiSuccess({ ...result, meta, mode });
    }

    if (mode === "sync_start") {
      const result = await startTripJackCatalogSyncSession({
        mode: underlyingMode,
        actorId: auth.user.id,
        actorEmail: auth.user.email,
      });
      const meta = await getTripJackHotelCatalogMeta();
      return apiSuccess({ ...result, meta, mode: underlyingMode });
    }

    if (mode === "mapping_page") {
      const page = Number(url.searchParams.get("page") ?? "0");
      const result = await syncTripJackHotelMappingPage({
        page: Number.isFinite(page) ? page : 0,
        syncLogId,
        actorId: auth.user.id,
      });
      const meta = await getTripJackHotelCatalogMeta();
      return apiSuccess({ ...result, meta, syncLogId });
    }

    if (mode === "content_batch") {
      const result = await syncTripJackHotelContentBatch({ syncLogId });
      const meta = await getTripJackHotelCatalogMeta();
      return apiSuccess({ ...result, meta, syncLogId });
    }

    if (mode === "sync_finalize") {
      if (!syncLogId) {
        return apiError("syncLogId is required for sync_finalize", 400);
      }
      const rebuildDestinations = url.searchParams.get("rebuildDestinations") !== "0";
      const result = await finalizeTripJackCatalogSync({
        syncLogId,
        rebuildDestinations,
        actorId: auth.user.id,
      });
      const meta = await getTripJackHotelCatalogMeta();
      const recentLogs = await listTripJackHotelSyncLogs(5);
      return apiSuccess({ ...result, meta, recentLogs, syncLogId });
    }

    if (mode === "location_backfill") {
      const maxHotelsParam = Number(url.searchParams.get("maxHotels") ?? "0");
      const chunked = url.searchParams.get("chunked") === "1";
      const maxHotels = Number.isFinite(maxHotelsParam) && maxHotelsParam > 0
        ? Math.min(LOCATION_BACKFILL_MAX_PER_RUN, maxHotelsParam)
        : LOCATION_BACKFILL_MAX_PER_RUN;

      const result = chunked
        ? await syncCatalogLocationBackfillBatch({
            maxHotels: Math.min(LOCATION_BACKFILL_CHUNK_SIZE, maxHotels),
          })
        : await runCatalogLocationBackfillRun({ maxHotels });

      const meta = await getTripJackHotelCatalogMeta();
      return apiSuccess({ ...result, meta, mode });
    }

    if (mode === "image_backfill") {
      const maxHotelsParam = Number(url.searchParams.get("maxHotels") ?? "0");
      const chunked = url.searchParams.get("chunked") === "1";
      const maxHotels = Number.isFinite(maxHotelsParam) && maxHotelsParam > 0
        ? Math.min(IMAGE_BACKFILL_MAX_PER_RUN, maxHotelsParam)
        : IMAGE_BACKFILL_MAX_PER_RUN;

      const result = chunked
        ? await syncCatalogImageBackfillBatch({
            maxHotels: Math.min(MAX_HOTEL_CONTENT_BATCH, maxHotels),
          })
        : await runCatalogImageBackfillRun({ maxHotels });

      const meta = await getTripJackHotelCatalogMeta();
      return apiSuccess({ ...result, meta, mode });
    }

    const maxMappingPages = Number(
      url.searchParams.get("maxMappingPages") ?? url.searchParams.get("maxPages") ?? "5"
    );
    const startMappingPage = Number(url.searchParams.get("startMappingPage") ?? "0");
    const maxContentBatches = Number(url.searchParams.get("maxContentBatches") ?? "20");

    const result = await syncTripJackHotelCatalog({
      mode,
      maxMappingPages: Number.isFinite(maxMappingPages) ? maxMappingPages : 5,
      maxContentBatches: Number.isFinite(maxContentBatches) ? maxContentBatches : 20,
      startMappingPage: Number.isFinite(startMappingPage) ? startMappingPage : 0,
      rebuildDestinations: mode !== "mapping_only",
      actorId: auth.user.id,
      actorEmail: auth.user.email,
    });

    const meta = await getTripJackHotelCatalogMeta();
    const recentLogs = await listTripJackHotelSyncLogs(5);

    return apiSuccess({ ...result, meta, recentLogs, mode, actor: auth.user.id });
  } catch (error) {
    if (error instanceof TripJackHotelStaticApiError) {
      return staticApiErrorResponse(error);
    }
    const message = error instanceof Error ? error.message : "Sync failed";
    return apiError(message, 500, {
      adminMessage: message,
      rawPreview: message.slice(0, 500),
    });
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;
    const meta = await getTripJackHotelCatalogMeta();
    const logs = await listTripJackHotelSyncLogs(20);
    return apiSuccess({ meta, logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load sync status";
    return apiError(message, 500);
  }
}
