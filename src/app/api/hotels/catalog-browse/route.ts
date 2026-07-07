import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api-response";
import { browseCatalogHotelsPaged } from "@/lib/tripjack-hotels/catalog-browse-page";
import {
  getHotelWebsiteSettings,
  isTripjackHotelsWebsiteEnabled,
} from "@/lib/hotels/website-settings";

export const dynamic = "force-dynamic";

const schema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(50),
  query: z.string().trim().optional(),
  city: z.string().trim().optional(),
  minStars: z.coerce.number().int().min(0).max(5).optional(),
});

export async function GET(request: Request) {
  try {
    const settings = await getHotelWebsiteSettings();
    if (!isTripjackHotelsWebsiteEnabled(settings)) {
      return apiError("Live hotel browse is temporarily unavailable", 503);
    }

    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse({
      page: searchParams.get("page") ?? 1,
      pageSize: searchParams.get("pageSize") ?? 50,
      query: searchParams.get("query") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      minStars: searchParams.get("minStars") ?? undefined,
    });

    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const result = await browseCatalogHotelsPaged(parsed.data);

    return apiSuccess({
      ...result,
      message: `${result.totalCount.toLocaleString()} hotel${result.totalCount === 1 ? "" : "s"} available`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hotel browse failed";
    console.error("[hotels/catalog-browse]", message);
    return apiError(message, 500);
  }
}
