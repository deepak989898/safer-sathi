import { z } from "zod";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import {
  buildTripJackReviewBody,
  reviewTripJackFlight,
  TripJackApiError,
} from "@/lib/tripjack/client";
import { CABIN_CLASSES, FARE_TYPES } from "@/lib/tripjack/config";

const paxSchema = z.object({
  adults: z.number().int().min(1).max(9).optional(),
  children: z.number().int().min(0).max(9).optional(),
  infants: z.number().int().min(0).max(9).optional(),
  fromCode: z.string().length(3).optional(),
  toCode: z.string().length(3).optional(),
  departureDate: z.string().optional(),
  cabinClass: z.enum(CABIN_CLASSES).optional(),
  pft: z.enum(FARE_TYPES).optional(),
  isDirectFlight: z.boolean().optional(),
  isConnectingFlight: z.boolean().optional(),
});

const schema = z.object({
  priceId: z.string().min(1),
  searchTotalFare: z.number().optional(),
  searchParams: paxSchema.optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const searchParams = parsed.data.searchParams
      ? {
          fromCode: parsed.data.searchParams.fromCode ?? "",
          toCode: parsed.data.searchParams.toCode ?? "",
          departureDate: parsed.data.searchParams.departureDate ?? "",
          adults: parsed.data.searchParams.adults ?? 1,
          children: parsed.data.searchParams.children ?? 0,
          infants: parsed.data.searchParams.infants ?? 0,
          cabinClass: parsed.data.searchParams.cabinClass ?? "ECONOMY",
          pft: parsed.data.searchParams.pft ?? "REGULAR",
          isDirectFlight: parsed.data.searchParams.isDirectFlight ?? true,
          isConnectingFlight: parsed.data.searchParams.isConnectingFlight ?? true,
        }
      : undefined;

    const result = await reviewTripJackFlight({
      priceId: parsed.data.priceId,
      searchParams: searchParams as import("@/lib/tripjack/types").FlightSearchParams | undefined,
      searchTotalFare: parsed.data.searchTotalFare,
    });

    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    return apiSuccess({
      review: result.review,
      requestBody: buildTripJackReviewBody([parsed.data.priceId]),
      proxyEndpoint: process.env.TRIPJACK_PROXY_BASE_URL
        ? `${process.env.TRIPJACK_PROXY_BASE_URL.replace(/\/$/, "")}/api/tripjack/flights/review`
        : "http://178.128.151.233:4000/api/tripjack/flights/review",
      ...(includeDebug ? { debug: { rawResponse: result.rawResponse } } : {}),
    });
  } catch (error) {
    if (error instanceof TripJackApiError) {
      return apiError(error.message, error.statusCode ?? 502, { raw: error.raw });
    }
    const message = error instanceof Error ? error.message : "Flight review failed";
    return apiError(message, 500);
  }
}
