import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { syncGoaHotelsForBookscubagoa } from "@/lib/tripjack-hotels/goa-export";

export const maxDuration = 300;

/** Super-admin: export Goa TripJack hotels → public `goaHotels` for Bookscubagoa. */
export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    let opts: {
      maxLivePricing?: number;
      refreshContent?: boolean;
      enrichLivePricing?: boolean;
    } = {};
    try {
      const raw = await request.json();
      if (raw && typeof raw === "object") opts = raw as typeof opts;
    } catch {
      // empty body is fine — use defaults
    }

    const result = await syncGoaHotelsForBookscubagoa({
      refreshContent: opts.refreshContent !== false,
      enrichLivePricing: opts.enrichLivePricing !== false,
      maxLivePricing: typeof opts.maxLivePricing === "number" ? opts.maxLivePricing : 120,
    });

    return apiSuccess({
      ...result,
      collection: "goaHotels",
      message: `Exported ${result.exported} Goa hotels — ${result.withRooms} with rooms, ${result.withDescription} with description, ${result.livePriced} newly priced. Re-run export to fill more room rates.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Goa hotel export failed";
    console.error("[admin/tripjack-hotels/export-goa]", message);
    return apiError(message, 500);
  }
}
