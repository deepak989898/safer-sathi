import { updateTripJackHotelCatalogMeta } from "@/lib/tripjack-hotels/catalog-firestore";
import type { TripJackHotelNationality } from "@/lib/tripjack-hotels/catalog-types";
import {
  createTripJackHotelSyncLog,
  updateTripJackHotelOpsMeta,
  updateTripJackHotelSyncLog,
  upsertTripJackHotelNationalities,
} from "@/lib/tripjack-hotels/ops-firestore";
import { fetchTripJackHotelNationalities, TripJackHotelStaticApiError } from "@/lib/tripjack-hotels/static-client";
import { extractTripJackUpstreamData } from "@/lib/tripjack-hotels/proxy-envelope";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export async function syncTripJackHotelNationalities(input: {
  actorId: string;
  actorEmail?: string;
}): Promise<{ synced: number; message: string }> {
  const started = Date.now();
  const logId = await createTripJackHotelSyncLog({
    mode: "nationalities",
    startedAt: new Date().toISOString(),
    success: false,
    actorId: input.actorId,
    actorEmail: input.actorEmail,
    pagesFetched: 0,
    hotelsUpserted: 0,
    deletedMarked: 0,
    destinationsIndexed: 0,
    nationalitiesSynced: 0,
    failedRecords: 0,
    lastSyncNext: null,
  });

  try {
    const { data: rawData } = await fetchTripJackHotelNationalities();
    const data = extractTripJackUpstreamData(rawData);
    const root = asRecord(data) ?? {};
    const list =
      (Array.isArray(root.nationalities) ? root.nationalities : null) ??
      (Array.isArray(root.data) ? root.data : null) ??
      (Array.isArray(data) ? data : []);

    const now = new Date().toISOString();
    const entries: TripJackHotelNationality[] = [];

    for (const item of list) {
      const rec = asRecord(item);
      if (!rec) continue;
      const code = String(rec.code ?? rec.id ?? rec.nationalityCode ?? "").trim();
      const name = String(rec.name ?? rec.label ?? rec.nationality ?? code).trim();
      if (!code || !name) continue;
      entries.push({
        id: `nat_${code}`,
        code,
        name,
        searchKey: name.toLowerCase(),
        updatedAt: now,
      });
    }

    const synced = await upsertTripJackHotelNationalities(entries);
    const completedAt = new Date().toISOString();

    await updateTripJackHotelCatalogMeta({
      lastNationalitySyncAt: completedAt,
    });
    await updateTripJackHotelOpsMeta({ lastNationalitySyncAt: completedAt });

    await updateTripJackHotelSyncLog(logId, {
      completedAt,
      success: true,
      nationalitiesSynced: synced,
      durationMs: Date.now() - started,
    });

    return {
      synced,
      message: synced > 0 ? `Synced ${synced} nationalities` : "No nationalities returned from TripJack",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nationality sync failed";
    await updateTripJackHotelSyncLog(logId, {
      completedAt: new Date().toISOString(),
      success: false,
      errorMessage: message,
      durationMs: Date.now() - started,
    });
    if (error instanceof TripJackHotelStaticApiError) throw error;
    throw error;
  }
}
