import { requireStaffAuth } from "@/lib/admin/api-auth";
import { findBusCityByName } from "@/lib/bus/firestore";
import { busApiError } from "@/lib/bus/api-helpers";
import { apiSuccess } from "@/lib/api-response";
import { fetchAvailableTrips } from "@/lib/seatseller/client";

export const maxDuration = 300;

const SAMPLE_ROUTES = [
  { source: "Bangalore", destination: "Hyderabad" },
  { source: "Bangalore", destination: "Chennai" },
  { source: "Mysore", destination: "Bangalore" },
  { source: "Bangalore", destination: "Mangalore" },
  { source: "Pune", destination: "Bangalore" },
] as const;

function addDaysIso(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST(request: Request) {
  try {
    const auth = await requireStaffAuth(request);
    if ("error" in auth) return auth.error;

    const results: Array<Record<string, unknown>> = [];

    for (const route of SAMPLE_ROUTES) {
      const sourceCity = await findBusCityByName(route.source);
      const destinationCity = await findBusCityByName(route.destination);

      if (!sourceCity || !destinationCity) {
        results.push({
          route: `${route.source} → ${route.destination}`,
          error: "City not found in busCities",
          sourceFound: Boolean(sourceCity),
          destinationFound: Boolean(destinationCity),
        });
        continue;
      }

      let matched: Record<string, unknown> | null = null;
      const today = new Date();

      for (let day = 0; day <= 15; day += 1) {
        const doj = addDaysIso(today, day);
        const fetchResult = await fetchAvailableTrips({
          source: sourceCity.id,
          destination: destinationCity.id,
          doj,
        });
        if (fetchResult.trips.length > 0) {
          matched = {
            route: `${route.source} → ${route.destination}`,
            date: doj,
            sourceId: sourceCity.id,
            sourceName: sourceCity.name,
            sourceState: sourceCity.state ?? null,
            destinationId: destinationCity.id,
            destinationName: destinationCity.name,
            destinationState: destinationCity.state ?? null,
            count: fetchResult.trips.length,
            apiUrl: fetchResult.apiUrl,
            journeyDateSentToApi: fetchResult.journeyDateSentToApi,
          };
          break;
        }
      }

      results.push(
        matched ?? {
          route: `${route.source} → ${route.destination}`,
          sourceId: sourceCity.id,
          sourceName: sourceCity.name,
          destinationId: destinationCity.id,
          destinationName: destinationCity.name,
          count: 0,
          message: "No trips found in next 15 days",
        }
      );
    }

    return apiSuccess({ results, testedAt: new Date().toISOString() });
  } catch (error) {
    return busApiError(error, "Route test failed");
  }
}
