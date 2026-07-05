import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { getTripJackHotelCatalogMeta } from "@/lib/tripjack-hotels/catalog-firestore";
import { syncTripJackHotelCatalog } from "@/lib/tripjack-hotels/catalog-sync";
import { TripJackHotelStaticApiError } from "@/lib/tripjack-hotels/static-client";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const url = new URL(request.url);
    const maxPages = Number(url.searchParams.get("maxPages") ?? "50");
    const startSyncNext = url.searchParams.get("syncNext");

    const result = await syncTripJackHotelCatalog({
      maxPages: Number.isFinite(maxPages) ? maxPages : 50,
      startSyncNext: startSyncNext || null,
      rebuildDestinations: true,
    });

    const meta = await getTripJackHotelCatalogMeta();

    return apiSuccess({
      ...result,
      meta,
      actor: auth.user.id,
    });
  } catch (error) {
    if (error instanceof TripJackHotelStaticApiError) {
      return apiError(error.message, error.statusCode ?? 502, {
        upstreamUrl: error.upstreamUrl,
        details: error.raw,
      });
    }
    const message = error instanceof Error ? error.message : "Hotel catalog sync failed";
    return apiError(message, 500);
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const meta = await getTripJackHotelCatalogMeta();
    return apiSuccess({ meta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load catalog meta";
    return apiError(message, 500);
  }
}
