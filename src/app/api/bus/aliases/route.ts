import { getBusAliasesFromDb } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { fetchAliases } from "@/lib/seatseller/client";
import { apiSuccess } from "@/lib/api-response";

export async function GET() {
  try {
    let aliases = await getBusAliasesFromDb();
    if (!aliases.length) {
      const remote = await fetchAliases();
      aliases = remote.map((a) => ({
        id: String(a.id),
        cityName: a.cityName,
        aliasNames: a.aliasNames ?? [],
        syncedAt: new Date().toISOString(),
      }));
    }
    return apiSuccess({ aliases, count: aliases.length });
  } catch (error) {
    return busApiError(error, "Failed to load city aliases");
  }
}
