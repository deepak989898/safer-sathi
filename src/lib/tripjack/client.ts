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
import { extractTripJackBookingId } from "@/lib/tripjack/extract-booking-id";
import {
  extractTripJackProxyErrorMessage,
  fareValidateFailureHint,
} from "@/lib/tripjack/extract-proxy-error";

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
      extractTripJackProxyErrorMessage(record, `Proxy error ${response.status}`),
      response.status,
      raw
    );
  }

  if (record.success === false) {
    throw new TripJackApiError(
      extractTripJackProxyErrorMessage(record, "TripJack search failed"),
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
    const hint =
      response.status === 404
        ? "Review proxy route missing on VPS. Add POST /api/tripjack/flights/review to server.js and run: pm2 restart tripjack-proxy"
        : "Invalid JSON from TripJack review proxy";
    throw new TripJackApiError(hint, response.status, rawText);
  }

  const record = raw as Record<string, unknown>;
  if (!response.ok) {
    throw new TripJackApiError(
      extractTripJackProxyErrorMessage(record, `Review proxy error ${response.status}`),
      response.status,
      raw
    );
  }

  if (record.success === false) {
    throw new TripJackApiError(
      extractTripJackProxyErrorMessage(record, "TripJack review failed"),
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
    const message = extractTripJackProxyErrorMessage(
      record,
      `Fare validate proxy error ${response.status}`
    );
    throw new TripJackApiError(
      fareValidateFailureHint(message, response.status),
      response.status,
      raw
    );
  }

  if (record.success === false) {
    const message = extractTripJackProxyErrorMessage(record, "TripJack fare validate failed");
    throw new TripJackApiError(
      fareValidateFailureHint(message, response.status),
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

async function tripjackProxyPost(url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const rawText = await response.text();
  let raw: unknown;
  try {
    raw = rawText ? JSON.parse(rawText) : {};
  } catch {
    const preview = rawText.trim().slice(0, 200);
    const hint = preview.startsWith("<")
      ? `TripJack proxy returned HTML (route may be missing on VPS: ${url}).`
      : `Invalid JSON from TripJack proxy (${url}).`;
    throw new TripJackApiError(hint, response.status, rawText);
  }

  const record = raw as Record<string, unknown>;
  if (!response.ok || record.success === false) {
    throw new TripJackApiError(
      extractTripJackProxyErrorMessage(record, `TripJack proxy error ${response.status}`),
      response.status,
      { ...record, upstreamUrl: url }
    );
  }

  return raw;
}

export async function bookTripJackFlight(
  request: import("@/lib/tripjack/build-book").TripJackBookRequest
): Promise<import("@/lib/tripjack/types").FlightBookResult> {
  const { bookUrl } = getTripJackProxyConfig();
  console.log("[tripjack-client] Book API →", bookUrl);
  const raw = await tripjackProxyPost(bookUrl, request);
  const payload = raw as Record<string, unknown>;
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const status = data.status as Record<string, unknown> | undefined;
  if (status && status.success === false) {
    throw new TripJackApiError(
      String(status.message ?? data.message ?? "TripJack book failed"),
      Number(status.httpStatus) || undefined,
      raw
    );
  }
  const bookingId =
    extractTripJackBookingId(raw) ||
    String(data.bookingId ?? request.bookingId ?? "");

  return { bookingId, rawResponse: raw };
}

export async function fetchTripJackBookingDetails(
  bookingId: string,
  options?: { requirePaxPricing?: boolean }
): Promise<unknown> {
  const { bookingDetailsUrl } = getTripJackProxyConfig();
  const body: Record<string, unknown> = { bookingId: bookingId.trim() };
  if (options?.requirePaxPricing) body.requirePaxPricing = true;
  console.log("[tripjack-client] Booking Details API →", bookingDetailsUrl, body);
  return tripjackProxyPost(bookingDetailsUrl, body);
}

export async function confirmTripJackFareBeforeTicket(bookingId: string): Promise<unknown> {
  const { confirmFareUrl } = getTripJackProxyConfig();
  return tripjackProxyPost(confirmFareUrl, { bookingId });
}

/** GetCharges sample: { bookingId, type: "CANCELLATION", remarks } */
export async function fetchTripJackCancellationCharges(input: {
  bookingId: string;
  remarks?: string;
  trips?: unknown[];
}): Promise<unknown> {
  const { getChargesUrl } = getTripJackProxyConfig();
  const body: Record<string, unknown> = {
    bookingId: input.bookingId.trim(),
    type: "CANCELLATION",
    remarks: input.remarks ?? "Customer cancellation request",
  };
  if (input.trips?.length) body.trips = input.trips;
  console.log("[tripjack-client] Get Charges API →", getChargesUrl, body);
  return tripjackProxyPost(getChargesUrl, body);
}

/** SubmitAmendment sample: { bookingId, type: "CANCELLATION", remarks } */
export async function submitTripJackAmendment(input: {
  bookingId: string;
  remarks?: string;
  trips?: unknown[];
}): Promise<unknown> {
  const { submitAmendmentUrl } = getTripJackProxyConfig();
  const body: Record<string, unknown> = {
    bookingId: input.bookingId.trim(),
    type: "CANCELLATION",
    remarks: input.remarks ?? "Customer cancellation",
  };
  if (input.trips?.length) body.trips = input.trips;
  console.log("[tripjack-client] Submit Amendment API →", submitAmendmentUrl, body);
  return tripjackProxyPost(submitAmendmentUrl, body);
}

/** Poll Amendment sample: { amendmentId } */
export async function pollTripJackAmendment(amendmentId: string): Promise<unknown> {
  const { pollAmendmentUrl } = getTripJackProxyConfig();
  const body = { amendmentId: amendmentId.trim() };
  console.log("[tripjack-client] Poll Amendment API →", pollAmendmentUrl, body);
  return tripjackProxyPost(pollAmendmentUrl, body);
}

/** Release PNR sample: { bookingId, pnrs: string[] } */
export async function releaseTripJackPnr(input: {
  bookingId: string;
  pnrs: string[];
}): Promise<unknown> {
  const { releasePnrUrl } = getTripJackProxyConfig();
  const body = {
    bookingId: input.bookingId.trim(),
    pnrs: input.pnrs,
  };
  console.log("[tripjack-client] Release PNR API →", releasePnrUrl, body);
  return tripjackProxyPost(releasePnrUrl, body);
}
