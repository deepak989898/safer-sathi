import {
  getPopularBusCitiesFromDb,
  searchBusCitiesInDb,
} from "@/lib/bus/firestore";
import { prepareBusCityResults } from "@/lib/bus/cities-search";
import { busApiError } from "@/lib/bus/api-helpers";
import { apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.toLowerCase().trim() ?? "";

    let raw;
    if (!q || q.length < 2) {
      raw = await getPopularBusCitiesFromDb();
    } else {
      raw = await searchBusCitiesInDb(q);
    }

    const cities = prepareBusCityResults(raw, q);
    return apiSuccess({ cities, count: cities.length, query: q });
  } catch (error) {
    return busApiError(error, "Failed to load cities");
  }
}
