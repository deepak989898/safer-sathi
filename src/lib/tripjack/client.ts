import { getTripJackProxyConfig } from "@/lib/tripjack/config";
import { normalizeTripJackFlights } from "@/lib/tripjack/normalize";
import { normalizeTripJackReview } from "@/lib/tripjack/parse-review";
import { normalizeTripJackFareValidate } from "@/lib/tripjack/parse-fare-validate";
import type {
  FareValidateRequest,
  FareValidateResult,
  FlightReviewResult,
  FlightSearchParams,
  FlightSearchResult,
} from "@/lib/tripjack/types";

export class TripJackApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public raw?: unknown
  ) {
    super(message);
    this.name = "TripJackApiError";
  }
}

export function buildTripJackSearchBody(params: FlightSearchParams) {
  return {
    searchQuery: {
      cabinClass: params.cabinClass,
      paxInfo: {
        ADULT: String(Math.max(1, params.adults)),
        CHILD: String(Math.max(0, params.children)),
        INFANT: String(Math.max(0, params.infants)),
      },
      routeInfos: [
        {
          fromCityOrAirport: { code: params.fromCode.toUpperCase() },
          toCityOrAirport: { code: params.toCode.toUpperCase() },
          travelDate: params.departureDate,
        },
      ],
      searchModifiers: {
        pft: params.pft,
        isDirectFlight: params.isDirectFlight,
        isConnectingFlight: params.isConnectingFlight,
      },
    },
  };
}

export async function searchTripJackFlights(
  params: FlightSearchParams
): Promise<FlightSearchResult> {
  const { searchUrl } = getTripJackProxyConfig();
  const body = buildTripJackSearchBody(params);

  const response = await fetch(searchUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const rawText = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new TripJackApiError("Invalid JSON from TripJack proxy", response.status, rawText);
  }

  const record = raw as Record<string, unknown>;
  if (!response.ok) {
    throw new TripJackApiError(
      String(record.error ?? record.message ?? `Proxy error ${response.status}`),
      response.status,
      raw
    );
  }

  if (record.success === false) {
    throw new TripJackApiError(
      String(record.error ?? record.message ?? "TripJack search failed"),
      response.status,
      raw
    );
  }

  const data = record.data ?? raw;
  const innerRecord = data as Record<string, unknown>;
  const status = innerRecord?.status as Record<string, unknown> | undefined;
  if (status?.success === false) {
    throw new TripJackApiError(
      String(status.message ?? "TripJack API returned failure"),
      Number(status.httpStatus) || response.status,
      raw
    );
  }

  const { flights, onwardCount, payloadShape } = normalizeTripJackFlights(raw);

  return {
    flights,
    onwardCount,
    payloadShape: {
      topLevelKeys: payloadShape.topLevelKeys,
      tripInfoKeys: payloadShape.tripInfoKeys,
    },
    rawResponse: raw,
  };
}

export function buildTripJackReviewBody(priceIds: string[]) {
  return { priceIds };
}

export async function reviewTripJackFlight(input: {
  priceId: string;
  searchParams?: FlightSearchParams;
  searchTotalFare?: number;
}): Promise<FlightReviewResult> {
  const { reviewUrl } = getTripJackProxyConfig();
  const body = buildTripJackReviewBody([input.priceId]);

  const response = await fetch(reviewUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const rawText = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new TripJackApiError("Invalid JSON from TripJack review proxy", response.status, rawText);
  }

  const record = raw as Record<string, unknown>;
  if (!response.ok) {
    throw new TripJackApiError(
      String(record.error ?? record.message ?? `Review proxy error ${response.status}`),
      response.status,
      raw
    );
  }

  if (record.success === false) {
    throw new TripJackApiError(
      String(record.error ?? record.message ?? "TripJack review failed"),
      response.status,
      raw
    );
  }

  const review = normalizeTripJackReview(raw, {
    priceId: input.priceId,
    searchParams: input.searchParams,
    searchTotalFare: input.searchTotalFare,
  });

  if (!review) {
    throw new TripJackApiError("Could not parse TripJack review response", response.status, raw);
  }

  return { review, rawResponse: raw };
}

export async function fareValidateTripJackFlight(input: {
  request: FareValidateRequest;
  previousTotalFare?: number;
}): Promise<FareValidateResult> {
  const { fareValidateUrl } = getTripJackProxyConfig();

  const response = await fetch(fareValidateUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.request),
    cache: "no-store",
  });

  const rawText = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new TripJackApiError(
      "Invalid JSON from TripJack fare validate proxy",
      response.status,
      rawText
    );
  }

  const record = raw as Record<string, unknown>;
  if (!response.ok) {
    throw new TripJackApiError(
      String(record.error ?? record.message ?? `Fare validate proxy error ${response.status}`),
      response.status,
      raw
    );
  }

  if (record.success === false) {
    throw new TripJackApiError(
      String(record.error ?? record.message ?? "TripJack fare validate failed"),
      response.status,
      raw
    );
  }

  const validated = normalizeTripJackFareValidate(raw, input.request, {
    previousTotalFare: input.previousTotalFare,
  });

  if (!validated) {
    throw new TripJackApiError(
      "Could not parse TripJack fare validate response",
      response.status,
      raw
    );
  }

  return { validated, rawResponse: raw };
}
