import { getTripJackHotelProxyConfig } from "@/lib/tripjack-hotels/config";

export class TripJackHotelStaticApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public raw?: unknown,
    public upstreamUrl?: string
  ) {
    super(message);
    this.name = "TripJackHotelStaticApiError";
  }
}

async function postStatic<T = unknown>(
  pathKey: keyof ReturnType<typeof getTripJackHotelProxyConfig>,
  body: Record<string, unknown>
): Promise<{ data: T; upstreamUrl: string; upstreamStatus: number }> {
  const config = getTripJackHotelProxyConfig();
  const url = config[pathKey] as string;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new TripJackHotelStaticApiError(
      "Invalid JSON from TripJack hotel static API",
      response.status || 502,
      { raw: text.slice(0, 500) },
      url
    );
  }

  const envelope = raw as Record<string, unknown>;
  const upstreamUrl = asString(envelope.upstreamUrl) || url;
  const upstreamStatus = Number(envelope.upstreamStatus ?? response.status);

  if (!response.ok || envelope.success === false) {
    const errMsg =
      asString(envelope.error) ||
      asString((envelope.data as Record<string, unknown> | undefined)?.message) ||
      "TripJack hotel static API failed";
    throw new TripJackHotelStaticApiError(errMsg, upstreamStatus || response.status, raw, upstreamUrl);
  }

  const data = (envelope.data ?? envelope) as T;
  return { data, upstreamUrl, upstreamStatus };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function fetchTripJackStaticHotels(syncNext?: string | null) {
  const body: Record<string, unknown> = {};
  if (syncNext) body.syncNext = syncNext;
  return postStatic<unknown>("fetchStaticHotelsUrl", body);
}

export async function fetchTripJackDeletedStaticHotels(syncNext?: string | null) {
  const body: Record<string, unknown> = {};
  if (syncNext) body.syncNext = syncNext;
  return postStatic<unknown>("fetchStaticHotelsDeletedUrl", body);
}

export async function fetchTripJackHotelMapping(body: Record<string, unknown> = {}) {
  return postStatic<unknown>("fetchHotelMappingUrl", body);
}

export async function fetchTripJackHotelStaticDetail(body: Record<string, unknown>) {
  return postStatic<unknown>("staticDetailUrl", body);
}

export async function fetchTripJackHotelNationalities() {
  return postStatic<unknown>("nationalitiesUrl", {});
}
