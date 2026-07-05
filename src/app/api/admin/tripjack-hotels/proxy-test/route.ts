import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { runTripJackHotelProxyRouteTests } from "@/lib/tripjack-hotels/proxy-route-test";

export const maxDuration = 60;

/** Super-admin: test VPS proxy health + static/nationality routes. */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const result = await runTripJackHotelProxyRouteTests();
    const blockingFailures = result.results.filter((row) => !row.ok && !row.warning);
    const allOk = blockingFailures.length === 0;

    return apiSuccess({
      ...result,
      allOk,
      message: allOk
        ? result.staticCatalogueBlocked
          ? "VPS proxy routes OK — static catalogue blocked by TripJack account permissions"
          : "All proxy route tests passed"
        : result.bookingRoutesOk === false
          ? "Booking routes (listing/pricing/review) missing on VPS — paste docs/tripjack-vps-hotel-all-routes.js into server.js"
          : "Some proxy route tests failed — check VPS server.js routes and .env",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy test failed";
    return apiError(message, 500);
  }
}
