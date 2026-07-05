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
    const allOk = result.results.every((row) => row.ok);

    return apiSuccess({
      ...result,
      allOk,
      message: allOk
        ? "All proxy route tests passed"
        : "Some proxy route tests failed — check VPS server.js routes and .env",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy test failed";
    return apiError(message, 500);
  }
}
