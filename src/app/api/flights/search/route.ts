import { z } from "zod";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { buildTripJackSearchBody, searchTripJackFlights, TripJackApiError } from "@/lib/tripjack/client";
import { CABIN_CLASSES, FARE_TYPES } from "@/lib/tripjack/config";

const schema = z.object({
  fromCode: z.string().min(3).max(3),
  toCode: z.string().min(3).max(3),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(9).default(1),
  children: z.number().int().min(0).max(9).default(0),
  infants: z.number().int().min(0).max(9).default(0),
  cabinClass: z.enum(CABIN_CLASSES).default("ECONOMY"),
  pft: z.enum(FARE_TYPES).default("REGULAR"),
  isDirectFlight: z.boolean().default(true),
  isConnectingFlight: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const params = {
      ...parsed.data,
      fromCode: parsed.data.fromCode.toUpperCase(),
      toCode: parsed.data.toCode.toUpperCase(),
    };

    const result = await searchTripJackFlights(params);
    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    return apiSuccess({
      count: result.flights.length,
      onwardCount: result.onwardCount,
      flights: result.flights,
      message:
        result.flights.length > 0
          ? `${result.onwardCount} flight(s) found`
          : "No flights found for this route and date. Try another date or route.",
      requestBody: buildTripJackSearchBody(params),
      proxyEndpoint: process.env.TRIPJACK_PROXY_BASE_URL
        ? `${process.env.TRIPJACK_PROXY_BASE_URL.replace(/\/$/, "")}/api/tripjack/flights/search`
        : "http://178.128.151.233:4000/api/tripjack/flights/search",
      payloadShape: result.payloadShape,
      ...(includeDebug ? { debug: { rawResponse: result.rawResponse } } : {}),
    });
  } catch (error) {
    if (error instanceof TripJackApiError) {
      return apiError(error.message, error.statusCode ?? 502, { raw: error.raw });
    }
    const message = error instanceof Error ? error.message : "Flight search failed";
    return apiError(message, 500);
  }
}
