import { z } from "zod";
import { logBusSearch } from "@/lib/bus/firestore";
import { busApiError, getBusUserId } from "@/lib/bus/api-helpers";
import { formatSeatSellerDoj } from "@/lib/seatseller/config";
import { fetchAvailableTrips } from "@/lib/seatseller/client";
import { getTripStartingFare } from "@/lib/seatseller/demo-data";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  doj: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const doj = parsed.data.doj;
    const trips = await fetchAvailableTrips({
      source: parsed.data.source,
      destination: parsed.data.destination,
      doj,
    });

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

    return apiSuccess({ trips: normalized, doj: formatSeatSellerDoj(parsed.data.doj), cached: false });
  } catch (error) {
    return busApiError(error, "Failed to fetch trips");
  }
}
