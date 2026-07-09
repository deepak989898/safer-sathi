import { NextResponse } from "next/server";
import { getFeaturedTripJackHotels } from "@/lib/tripjack-hotels/featured-catalog";
import {
  countContentSyncedTripJackHotels,
  getTripJackHotelCatalogMeta,
  getTripJackHotelCityFilterStats,
} from "@/lib/tripjack-hotels/catalog-firestore";
import { getHotelWebsiteSettings, isTripjackHotelsWebsiteEnabled } from "@/lib/hotels/website-settings";

export const dynamic = "force-dynamic";

const STALE_SYNC_MS = 20 * 60 * 1000;

function isStaleCatalogSync(meta: Awaited<ReturnType<typeof getTripJackHotelCatalogMeta>>): boolean {
  if (!meta.syncInProgress) return false;
  const lastSyncedAt = meta.lastSyncedAt ? Date.parse(meta.lastSyncedAt) : NaN;
  if (!Number.isFinite(lastSyncedAt)) return true;
  return Date.now() - lastSyncedAt > STALE_SYNC_MS;
}

export async function GET(request: Request) {
  try {
    const settings = await getHotelWebsiteSettings();
    if (!isTripjackHotelsWebsiteEnabled(settings)) {
      return NextResponse.json({ success: true, data: { hotels: [], catalog: null } });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(30, Math.max(1, Number(searchParams.get("limit") ?? 24) || 24));

    const [hotels, contentSyncedCount, meta, filterCounts] = await Promise.all([
      getFeaturedTripJackHotels(limit),
      countContentSyncedTripJackHotels(),
      getTripJackHotelCatalogMeta(),
      getTripJackHotelCityFilterStats(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        hotels,
        catalog: {
          contentSyncedCount,
          totalActiveHotels: meta.activeHotels ?? meta.totalHotels ?? 0,
          syncInProgress: Boolean(meta.syncInProgress) && !isStaleCatalogSync(meta),
          contentSuccessCount: meta.contentSuccessCount ?? contentSyncedCount,
        },
        filterCounts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load featured hotels";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
