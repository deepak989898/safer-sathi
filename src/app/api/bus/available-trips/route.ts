import { z } from "zod";
import { logBusSearch } from "@/lib/bus/firestore";
import { busApiError, getBusUserId } from "@/lib/bus/api-helpers";
import { formatSeatSellerDoj } from "@/lib/seatseller/config";
import { SeatSellerApiError, fetchAvailableTrips } from "@/lib/seatseller/client";
import { getTripStartingFare } from "@/lib/seatseller/demo-data";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  doj: z.string().min(1),
  sourceName: z.string().optional(),
  destinationName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const doj = parsed.data.doj.slice(0, 10);
    const trips = await fetchAvailableTrips({
      source: parsed.data.source,
      destination: parsed.data.destination,
      doj,
    });

    const userId = await getBusUserId(request);
    await logBusSearch({
      sourceCityId: parsed.data.source,
      destinationCityId: parsed.data.destination,
      doj: formatSeatSellerDoj(doj),
      resultCount: trips.length,
      userId,
    });

    const normalized = trips.map((trip) => ({
      ...trip,
      startingFare: getTripStartingFare(trip),
    }));

    return apiSuccess({
      success: true,
      trips: normalized,
      count: normalized.length,
      message:
        normalized.length > 0
          ? "Trips fetched successfully"
          : "No buses found for this route/date. Please try another date.",
      doj: formatSeatSellerDoj(doj),
    });
  } catch (error) {
    if (error instanceof SeatSellerApiError) {
      return apiError("Failed to fetch trips from SeatSeller", 502, {
        rawError: error.raw ?? error.message,
      });
    }
    return busApiError(error, "Failed to fetch trips");
  }
}
