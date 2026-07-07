import { z } from "zod";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { searchCatalogBrowseHotels } from "@/lib/tripjack-hotels/catalog-browse";
import {
  getHotelWebsiteSettings,
  isTripjackHotelsWebsiteEnabled,
} from "@/lib/hotels/website-settings";

export const dynamic = "force-dynamic";

const schema = z
  .object({
    destination: z.string().trim().optional(),
    hids: z.array(z.number().int().positive()).optional(),
    limit: z.number().int().min(1).max(120).optional(),
  })
  .refine((data) => (data.destination && data.destination.length >= 2) || (data.hids?.length ?? 0) > 0, {
    message: "destination or hids is required",
  });

export async function POST(request: Request) {
  try {
    const settings = await getHotelWebsiteSettings();
    if (!isTripjackHotelsWebsiteEnabled(settings)) {
      return apiError("Live hotel search is temporarily unavailable", 503);
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await searchCatalogBrowseHotels({
      destination: parsed.data.destination,
      hids: parsed.data.hids,
      limit: parsed.data.limit,
    });

    if (!result.hotels.length) {
      return apiError(
        `No hotels found for "${parsed.data.destination ?? "selection"}". Try another city or hotel name.`,
        404,
        { destinationLabel: result.destinationLabel }
      );
    }

    return apiSuccess({
      browseMode: true,
      destinationLabel: result.destinationLabel,
      hotels: result.hotels,
      totalResults: result.totalResults,
      truncated: result.truncated,
      message: `${result.totalResults} hotel${result.totalResults === 1 ? "" : "s"} found in ${result.destinationLabel}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hotel catalog search failed";
    return apiError(message, 500);
  }
}
