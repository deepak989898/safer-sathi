import { z } from "zod";
import { logBusSearch } from "@/lib/bus/firestore";
import { busApiError, getBusUserId } from "@/lib/bus/api-helpers";
import { formatSeatSellerDoj } from "@/lib/seatseller/config";
import { fetchAliases, fetchAvailableTrips, fetchCities } from "@/lib/seatseller/client";
import { getTripStartingFare } from "@/lib/seatseller/demo-data";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  doj: z.string().min(1),
  sourceName: z.string().optional(),
  destinationName: z.string().optional(),
});

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

async function resolveCityIdByName(name?: string): Promise<string | null> {
  if (!name) return null;
  const query = normalizeName(name);
  if (!query) return null;

  const [cities, aliases] = await Promise.all([fetchCities(), fetchAliases()]);

  const city = cities.find((c) => normalizeName(c.name) === query);
  if (city) return String(city.id);

  const alias = aliases.find(
    (a) =>
      normalizeName(a.cityName) === query ||
      (a.aliasNames ?? []).some((aliasName) => normalizeName(aliasName) === query)
  );
  if (!alias) return null;

  const aliasedCity = cities.find((c) => String(c.id) === String(alias.id));
  return aliasedCity ? String(aliasedCity.id) : String(alias.id);
}

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const doj = parsed.data.doj;
    let finalSource = parsed.data.source;
    let finalDestination = parsed.data.destination;

    let trips = await fetchAvailableTrips({
      source: parsed.data.source,
      destination: parsed.data.destination,
      doj,
    });

    // Fallback: resolve canonical city IDs via cities/aliases and retry.
    if (!trips.length && (parsed.data.sourceName || parsed.data.destinationName)) {
      const [resolvedSource, resolvedDestination] = await Promise.all([
        resolveCityIdByName(parsed.data.sourceName),
        resolveCityIdByName(parsed.data.destinationName),
      ]);

      if (resolvedSource && resolvedDestination) {
        finalSource = resolvedSource;
        finalDestination = resolvedDestination;
        trips = await fetchAvailableTrips({
          source: resolvedSource,
          destination: resolvedDestination,
          doj,
        });
      }
    }

    const userId = await getBusUserId(request);
    await logBusSearch({
      sourceCityId: parsed.data.source,
      destinationCityId: parsed.data.destination,
      doj: formatSeatSellerDoj(parsed.data.doj),
      resultCount: trips.length,
      userId,
    });

    const normalized = trips.map((trip) => ({
      ...trip,
      startingFare: getTripStartingFare(trip),
    }));

    return apiSuccess({
      trips: normalized,
      doj: formatSeatSellerDoj(parsed.data.doj),
      cached: false,
      meta: {
        sourceRequested: parsed.data.source,
        destinationRequested: parsed.data.destination,
        sourceUsed: finalSource,
        destinationUsed: finalDestination,
      },
    });
  } catch (error) {
    return busApiError(error, "Failed to fetch trips");
  }
}
