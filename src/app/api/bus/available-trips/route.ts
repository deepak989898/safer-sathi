import { z } from "zod";
import { logBusSearch } from "@/lib/bus/firestore";
import { busApiError, getBusUserId } from "@/lib/bus/api-helpers";
import { buildBusSearchDebug } from "@/lib/bus/debug";
import { normalizeBusTrip } from "@/lib/bus/fare-utils";
import { formatSeatSellerDojIso } from "@/lib/seatseller/config";
import { SeatSellerApiError, fetchAvailableTrips } from "@/lib/seatseller/client";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { logBusApiCall } from "@/lib/bus/firestore";

const schema = z.object({
  source: z.string().min(1),
  destination: z.string().min(1),
  doj: z.string().min(1),
  sourceName: z.string().optional(),
  destinationName: z.string().optional(),
});

function normalizeJourneyDate(input: string): string {
  const trimmed = input.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const journeyDateInput = parsed.data.doj;
    const doj = normalizeJourneyDate(journeyDateInput);
    const requestBody = {
      source: parsed.data.source,
      destination: parsed.data.destination,
      doj,
      sourceName: parsed.data.sourceName ?? "",
      destinationName: parsed.data.destinationName ?? "",
    };

    const fetchResult = await fetchAvailableTrips({
      source: parsed.data.source,
      destination: parsed.data.destination,
      doj,
    });

    const normalized = fetchResult.trips
      .map((trip) => normalizeBusTrip(trip as Record<string, unknown>))
      .filter((trip) => Boolean(trip.id));

    const userId = await getBusUserId(request);
    await logBusSearch({
      sourceCityId: parsed.data.source,
      destinationCityId: parsed.data.destination,
      doj: fetchResult.journeyDateSentToApi,
      resultCount: normalized.length,
      userId,
    });

    const debug = buildBusSearchDebug({
      sourceCityName: parsed.data.sourceName,
      sourceCityId: parsed.data.source,
      destinationCityName: parsed.data.destinationName,
      destinationCityId: parsed.data.destination,
      journeyDateInput,
      journeyDateSentToApi: fetchResult.journeyDateSentToApi,
      requestBody,
      apiUrl: fetchResult.apiUrl,
      rawSeatSellerResponse: fetchResult.rawSeatSellerResponse,
      trips: normalized,
    });

    await logBusApiCall({
      endpoint: "/api/bus/available-trips",
      method: "POST",
      success: true,
      meta: debug as unknown as Record<string, unknown>,
    });

    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    return apiSuccess({
      count: normalized.length,
      trips: normalized,
      message:
        normalized.length > 0
          ? "Trips fetched successfully"
          : "No buses found for this route/date. Please try another date.",
      doj: formatSeatSellerDojIso(doj),
      ...(includeDebug ? { debug } : {}),
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
