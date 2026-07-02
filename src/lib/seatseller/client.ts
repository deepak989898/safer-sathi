import {
  buildAuthorizationHeader,
  buildOAuthSignature,
  createOAuthParams,
  mergeQueryParams,
} from "@/lib/seatseller/oauth";
import {
  getSeatSellerConfig,
  formatSeatSellerDoj,
  formatSeatSellerDojIso,
  formatSeatSellerDojNumeric,
  getAvailableTripsCacheTtlMs,
  isSeatSellerDemoMode,
} from "@/lib/seatseller/config";
import type {
  SeatSellerAlias,
  SeatSellerBlockTicketResponse,
  SeatSellerBookTicketResponse,
  SeatSellerBpDpDetails,
  SeatSellerCancellationData,
  SeatSellerCity,
  SeatSellerTrip,
  SeatSellerTripDetails,
  SeatSellerUpdatedFareResponse,
} from "@/lib/seatseller/types";
import { getDemoBpDp, getDemoCities, getDemoTripDetails, getDemoTrips } from "@/lib/seatseller/demo-data";
import { parseSeatSellerTrips } from "@/lib/seatseller/parse-trips";
import { logBusApiCall } from "@/lib/bus/firestore";

const availableTripsCache = new Map<
  string,
  { expiresAt: number; trips: SeatSellerTrip[] }
>();

export class SeatSellerApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public raw?: unknown
  ) {
    super(message);
    this.name = "SeatSellerApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  bookingId?: string;
}

async function seatsellerRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { consumerKey, consumerSecret, baseUrl } = getSeatSellerConfig();
  const method = options.method ?? "GET";
  const start = Date.now();

  const query = Object.fromEntries(
    Object.entries(options.query ?? {})
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)])
  );

  const url = new URL(`${baseUrl}${path}`);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));

  const oauthParams = createOAuthParams(consumerKey);
  const allParams: Record<string, string> = {
    ...mergeQueryParams(url.toString()),
    ...oauthParams,
  };

  if (options.body) {
    for (const [key, value] of Object.entries(options.body)) {
      if (value === undefined || value === null) continue;
      allParams[key] =
        typeof value === "object" ? JSON.stringify(value) : String(value);
    }
  }

  const signature = buildOAuthSignature(
    method,
    url.origin + url.pathname,
    allParams,
    consumerSecret
  );

  const signedOAuth = { ...oauthParams, oauth_signature: signature };
  const headers: Record<string, string> = {
    Authorization: buildAuthorizationHeader(signedOAuth),
    Accept: "application/json",
  };

  let fetchUrl = url.toString();
  let body: string | undefined;

  if (method === "GET") {
    const qs = new URLSearchParams({ ...query, ...signedOAuth });
    fetchUrl = `${url.origin}${url.pathname}?${qs.toString()}`;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body ?? {});
  }

  try {
    const res = await fetch(fetchUrl, { method, headers, body, cache: "no-store" });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const message =
        typeof data === "object" && data && "message" in data
          ? String((data as { message: string }).message)
          : typeof data === "string"
            ? data
            : `SeatSeller API error (${res.status})`;
      throw new SeatSellerApiError(message, res.status, data);
    }

    await logBusApiCall({
      endpoint: path,
      method,
      success: true,
      statusCode: res.status,
      bookingId: options.bookingId,
      durationMs: Date.now() - start,
    });

    return data as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "SeatSeller request failed";
    await logBusApiCall({
      endpoint: path,
      method,
      success: false,
      error: message,
      bookingId: options.bookingId,
      durationMs: Date.now() - start,
    });
    throw error;
  }
}

async function requestFirstSuccess<T>(
  paths: string[],
  options: RequestOptions
): Promise<T> {
  let lastError: unknown;
  for (const path of paths) {
    try {
      return await seatsellerRequest<T>(path, options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("SeatSeller request failed");
}

export async function fetchCities(): Promise<SeatSellerCity[]> {
  if (isSeatSellerDemoMode()) return getDemoCities();
  const data = await requestFirstSuccess<SeatSellerCity[] | { cities?: SeatSellerCity[] }>(
    ["/cities", "/Cities"],
    {}
  );
  if (Array.isArray(data)) return data;
  return data.cities ?? [];
}

export async function fetchAliases(): Promise<SeatSellerAlias[]> {
  if (isSeatSellerDemoMode()) return [];
  const data = await requestFirstSuccess<
    SeatSellerAlias[] | { aliases?: SeatSellerAlias[]; aliasNames?: SeatSellerAlias[] }
  >(["/aliases", "/Aliases"], {});
  if (Array.isArray(data)) return data;
  return data.aliases ?? data.aliasNames ?? [];
}

export interface AvailableTripsFetchResult {
  trips: SeatSellerTrip[];
  journeyDateSentToApi: string;
  apiUrl: string;
  rawSeatSellerResponse: unknown;
  responseKeys: string[];
}

export async function fetchAvailableTrips(input: {
  source: string;
  destination: string;
  doj: string;
}): Promise<AvailableTripsFetchResult> {
  if (isSeatSellerDemoMode()) {
    const trips = getDemoTrips(input.source, input.destination, input.doj);
    return {
      trips,
      journeyDateSentToApi: formatSeatSellerDojIso(input.doj),
      apiUrl: "demo://availabletrips",
      rawSeatSellerResponse: { availableTrips: trips },
      responseKeys: ["availableTrips"],
    };
  }
  const cacheKey = `${input.source}_${input.destination}_${input.doj}`;
  const cached = availableTripsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      trips: cached.trips,
      journeyDateSentToApi: formatSeatSellerDojIso(input.doj),
      apiUrl: `${getSeatSellerConfig().baseUrl}/availabletrips`,
      rawSeatSellerResponse: { availableTrips: cached.trips, cached: true },
      responseKeys: ["availableTrips", "cached"],
    };
  }

  const tryDojValues = [
    formatSeatSellerDojIso(input.doj),
    formatSeatSellerDoj(input.doj),
    formatSeatSellerDojNumeric(input.doj),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  const endpoints = ["/availabletrips", "/availableTrips"];
  let lastRaw: unknown = null;
  let lastKeys: string[] = [];
  let lastUrl = `${getSeatSellerConfig().baseUrl}/availabletrips`;
  let lastDoj = tryDojValues[0];

  for (const doj of tryDojValues) {
    for (const endpoint of endpoints) {
      const data = await seatsellerRequest<unknown>(endpoint, {
        query: {
          source: input.source,
          destination: input.destination,
          doj,
        },
      });
      lastRaw = data;
      const { trips, responseKeys } = parseSeatSellerTrips(data);
      lastKeys = responseKeys;
      lastDoj = doj;
      lastUrl = `${getSeatSellerConfig().baseUrl}${endpoint}?source=${input.source}&destination=${input.destination}&doj=${doj}`;

      const possibleError =
        data && typeof data === "object"
          ? String(
              (data as Record<string, unknown>).error ??
                (data as Record<string, unknown>).message ??
                ""
            )
          : "";
      if (!trips.length && possibleError) {
        throw new SeatSellerApiError(
          `SeatSeller availabletrips error: ${possibleError}`,
          undefined,
          data
        );
      }
      await logBusApiCall({
        endpoint,
        method: "GET",
        success: true,
        meta: {
          source: input.source,
          destination: input.destination,
          doj,
          responseKeys,
          extractedTrips: trips.length,
          apiUrl: lastUrl,
        },
      });
      if (trips.length > 0) {
        availableTripsCache.set(cacheKey, {
          trips,
          expiresAt: Date.now() + getAvailableTripsCacheTtlMs(),
        });
        return {
          trips,
          journeyDateSentToApi: doj,
          apiUrl: lastUrl,
          rawSeatSellerResponse: data,
          responseKeys,
        };
      }
    }
  }

  return {
    trips: [],
    journeyDateSentToApi: lastDoj,
    apiUrl: lastUrl,
    rawSeatSellerResponse: lastRaw,
    responseKeys: lastKeys,
  };
}

export async function fetchTripDetails(tripId: string): Promise<SeatSellerTripDetails> {
  if (isSeatSellerDemoMode()) return getDemoTripDetails(tripId);
  return requestFirstSuccess<SeatSellerTripDetails>(["/tripdetails", "/tripDetails"], {
    query: { id: tripId },
  });
}

export async function fetchTripDetailsV2(input: {
  inventoryId: string;
  bpId: string;
  dpId: string;
}): Promise<SeatSellerTripDetails> {
  if (isSeatSellerDemoMode()) return getDemoTripDetails(input.inventoryId);
  return requestFirstSuccess<SeatSellerTripDetails>(
    ["/tripdetailsV2", "/tripDetailsV2"],
    {
      method: "POST",
      body: {
        inventoryId: input.inventoryId,
        bpId: input.bpId,
        dpId: input.dpId,
      },
    }
  );
}

export async function fetchBpDpDetails(tripId: string): Promise<SeatSellerBpDpDetails> {
  if (isSeatSellerDemoMode()) return getDemoBpDp(tripId);
  return requestFirstSuccess<SeatSellerBpDpDetails>(["/bpdpDetails", "/bpdpdetails"], {
    query: { id: tripId },
  });
}

export async function blockTicket(
  payload: Record<string, unknown>,
  bookingId?: string
): Promise<SeatSellerBlockTicketResponse> {
  if (isSeatSellerDemoMode()) {
    return {
      blockKey: `demo_block_${Date.now()}`,
      expiresIn: 480,
      fare: Number(payload.totalFare ?? 0),
    };
  }
  return seatsellerRequest<SeatSellerBlockTicketResponse>("/blockTicket", {
    method: "POST",
    body: payload,
    bookingId,
  });
}

export async function getUpdatedFare(
  blockKey: string,
  bookingId?: string
): Promise<SeatSellerUpdatedFareResponse> {
  if (isSeatSellerDemoMode()) {
    return { totalFare: 0, baseFare: 0, taxes: 0 };
  }
  return requestFirstSuccess<SeatSellerUpdatedFareResponse>(
    ["/rtcfarebreakup", "/getUpdatedFare"],
    {
      query: { blockKey },
      bookingId,
    }
  );
}

export async function bookTicket(
  payload: Record<string, unknown>,
  bookingId?: string
): Promise<SeatSellerBookTicketResponse> {
  if (isSeatSellerDemoMode()) {
    const id = `DEMO${Date.now().toString().slice(-8)}`;
    return { tin: id, pnr: `PNR${id}`, status: "confirmed" };
  }
  return seatsellerRequest<SeatSellerBookTicketResponse>("/bookTicket", {
    method: "POST",
    body: payload,
    bookingId,
  });
}

export async function getTicket(tin: string, bookingId?: string): Promise<unknown> {
  if (isSeatSellerDemoMode()) {
    return { tin, pnr: `PNR${tin}`, status: "confirmed" };
  }
  return seatsellerRequest("/ticket", { query: { tin }, bookingId });
}

export async function fetchCancellationData(
  tin: string,
  bookingId?: string
): Promise<SeatSellerCancellationData> {
  if (isSeatSellerDemoMode()) {
    return { refundableAmount: 500, cancellationCharges: 100, cancelable: true };
  }
  return seatsellerRequest<SeatSellerCancellationData>("/cancellationdata", {
    query: { tin },
    bookingId,
  });
}

export async function cancelTicket(
  payload: Record<string, unknown>,
  bookingId?: string
): Promise<unknown> {
  if (isSeatSellerDemoMode()) {
    return { status: "cancelled", ...payload };
  }
  return seatsellerRequest("/cancelTicket", {
    method: "POST",
    body: payload,
    bookingId,
  });
}

export async function checkBookedTicket(tin: string, bookingId?: string): Promise<unknown> {
  if (isSeatSellerDemoMode()) {
    return { tin, status: "confirmed" };
  }
  return seatsellerRequest("/checkBookedTicket", { query: { tin }, bookingId });
}
