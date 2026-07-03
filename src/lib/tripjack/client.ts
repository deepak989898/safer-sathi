import { getTripJackProxyConfig } from "@/lib/tripjack/config";
import { normalizeTripJackFlights } from "@/lib/tripjack/normalize";
import type { FlightSearchParams, FlightSearchResult } from "@/lib/tripjack/types";

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
