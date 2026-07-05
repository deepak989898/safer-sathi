import "server-only";

import { getTripJackHotelProxyConfig } from "@/lib/tripjack-hotels/config";
import { tripJackHotelProxyFetch } from "@/lib/tripjack-hotels/api-logging";
import {
  parseTripJackProxyJson,
  unwrapTripJackProxyEnvelope,
} from "@/lib/tripjack-hotels/proxy-envelope";

export class TripJackHotelStaticApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public raw?: unknown,
    public upstreamUrl?: string,
    public upstreamStatus?: number,
    public rawPreview?: string
  ) {
    super(message);
    this.name = "TripJackHotelStaticApiError";
  }
}

function logStaticProxyCall(input: {
  label: string;
  url: string;
  method: string;
  httpStatus: number;
  upstreamUrl?: string;
  upstreamStatus?: number;
  ok: boolean;
}) {
  console.log("[tripjack-hotel-static]", {
    label: input.label,
    url: input.url,
    method: input.method,
    status: input.httpStatus,
    upstreamStatus: input.upstreamStatus,
    upstreamUrl: input.upstreamUrl,
    ok: input.ok,
  });
}

async function callStaticProxy<T = unknown>(input: {
  pathKey: keyof ReturnType<typeof getTripJackHotelProxyConfig>;
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
}): Promise<{ data: T; upstreamUrl: string; upstreamStatus: number }> {
  const config = getTripJackHotelProxyConfig();
  const url = config[input.pathKey] as string;
  const method = input.method ?? "POST";
  const label = String(input.pathKey);

  const { response: httpResponse, rawText } = await tripJackHotelProxyFetch({
    endpoint: `static/${label}`,
    url,
    method,
    requestBody: method === "POST" ? (input.body ?? {}) : undefined,
  });

  const { parsed, parseError } = parseTripJackProxyJson(rawText, url, httpResponse.status);
  if (parseError) {
    logStaticProxyCall({
      label,
      url,
      method,
      httpStatus: httpResponse.status,
      ok: false,
    });
    throw new TripJackHotelStaticApiError(
      parseError,
      httpResponse.status || 502,
      { raw: rawText.slice(0, 500) },
      url,
      httpResponse.status,
      rawText.slice(0, 300)
    );
  }

  const envelope = unwrapTripJackProxyEnvelope<T>(parsed, url, httpResponse.status);

  logStaticProxyCall({
    label,
    url,
    method,
    httpStatus: httpResponse.status,
    upstreamUrl: envelope.upstreamUrl,
    upstreamStatus: envelope.upstreamStatus,
    ok: envelope.success,
  });

  if (!envelope.success) {
    const msg =
      envelope.error ??
      (envelope.upstreamStatus === 403
        ? `TripJack upstream returned 403 — HMS API key may lack hotel static access or IP not whitelisted (${envelope.upstreamUrl})`
        : "TripJack hotel static API failed");
    throw new TripJackHotelStaticApiError(
      msg,
      envelope.upstreamStatus || httpResponse.status,
      parsed,
      envelope.upstreamUrl,
      envelope.upstreamStatus,
      envelope.rawPreview ?? rawText.slice(0, 300)
    );
  }

  return {
    data: envelope.data,
    upstreamUrl: envelope.upstreamUrl,
    upstreamStatus: envelope.upstreamStatus,
  };
}

function buildStaticPaginationBody(syncNext?: string | null): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (syncNext) {
    body.next = syncNext;
    body.syncNext = syncNext;
  }
  return body;
}

export async function fetchTripJackStaticHotels(syncNext?: string | null) {
  return callStaticProxy<unknown>({
    pathKey: "fetchStaticHotelsUrl",
    method: "POST",
    body: buildStaticPaginationBody(syncNext),
  });
}

export async function fetchTripJackDeletedStaticHotels(syncNext?: string | null) {
  return callStaticProxy<unknown>({
    pathKey: "fetchStaticHotelsDeletedUrl",
    method: "POST",
    body: buildStaticPaginationBody(syncNext),
  });
}

export async function fetchTripJackHotelMapping(body: Record<string, unknown> = {}) {
  return callStaticProxy<unknown>({ pathKey: "fetchHotelMappingUrl", method: "POST", body });
}

export async function fetchTripJackHotelStaticDetail(body: Record<string, unknown>) {
  return callStaticProxy<unknown>({ pathKey: "staticDetailUrl", method: "POST", body });
}

/** Nationality-info — GET upstream via VPS proxy (POST fallback on VPS if needed). */
export async function fetchTripJackHotelNationalities() {
  try {
    return await callStaticProxy<unknown>({ pathKey: "nationalitiesUrl", method: "GET" });
  } catch (getError) {
    if (!(getError instanceof TripJackHotelStaticApiError) || getError.statusCode !== 404) {
      throw getError;
    }
    return callStaticProxy<unknown>({ pathKey: "nationalitiesUrl", method: "POST", body: {} });
  }
}
