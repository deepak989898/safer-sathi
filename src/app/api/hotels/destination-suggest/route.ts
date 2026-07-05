import { apiError, apiSuccess } from "@/lib/api-response";
import { getPopularTripJackHotelDestinations } from "@/lib/tripjack-hotels/catalog-firestore";
import { suggestHotelDestinations } from "@/lib/tripjack-hotels/destination-resolver";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";

    if (!q || q.length < 2) {
      const popular = await getPopularTripJackHotelDestinations(12);
      const suggestions = popular.map((dest) => ({
        id: dest.id,
        type: dest.type,
        label: dest.label,
        subtitle: `${dest.countryName || "India"} · ${dest.hotelCount} hotel${dest.hotelCount === 1 ? "" : "s"}`,
        hotelCount: dest.hotelCount,
        hids: dest.hids.slice(0, 100),
      }));
      return apiSuccess({ suggestions, query: q, count: suggestions.length });
    }

    const suggestions = await suggestHotelDestinations(q, 12);
    return apiSuccess({ suggestions, query: q, count: suggestions.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load destination suggestions";
    return apiError(message, 500);
  }
}
