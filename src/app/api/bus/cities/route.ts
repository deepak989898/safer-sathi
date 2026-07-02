import { getBusCitiesFromDb } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { apiSuccess } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q")?.toLowerCase().trim() ?? "";
    const cities = await getBusCitiesFromDb();
    const isLikelyCity = (name: string) => {
      const n = name.toLowerCase();
      const blocked = ["darshan", "sight", "sightseeing", "tour", "airport", "intl"];
      return !blocked.some((word) => n.includes(word));
    };
    const normalized = cities
      .filter((city) => Boolean(city.id && city.name))
      .map((city) => ({
        ...city,
        searchName: city.searchName ?? city.name.toLowerCase().trim(),
      }))
      .filter((city) => isLikelyCity(city.name));
    const filtered = q
      ? normalized.filter(
          (city) =>
            city.searchName.includes(q) || city.name.toLowerCase().includes(q)
        )
      : normalized;
    return apiSuccess({ cities: filtered, count: filtered.length, query: q });
  } catch (error) {
    return busApiError(error, "Failed to load cities");
  }
}
