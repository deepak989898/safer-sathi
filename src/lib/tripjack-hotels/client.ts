import { getTripJackHotelProxyConfig } from "@/lib/tripjack-hotels/config";
import { normalizeTripJackHotelListing } from "@/lib/tripjack-hotels/normalize";
import type {
  HotelListingRequestBody,
  HotelListingResult,
  HotelListingSearchParams,
} from "@/lib/tripjack-hotels/types";

export class TripJackHotelApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public raw?: unknown,
    public upstreamUrl?: string
  ) {
    super(message);
    this.name = "TripJackHotelApiError";
  }
}

export function generateHotelCorrelationId(): string {
  return `htl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildHotelListingBody(
  params: HotelListingSearchParams
): HotelListingRequestBody {
  const rooms = params.rooms.map((room) => {
    const adults = Math.max(1, Number(room.adults) || 1);
    const children = Math.max(0, Number(room.children) || 0);
    const entry: HotelListingRequestBody["rooms"][number] = { adults };
    if (children > 0) {
      entry.children = children;
      entry.childAge = (room.childAge ?? []).slice(0, children).map((age) => Number(age) || 1);
      while (entry.childAge.length < children) entry.childAge.push(5);
    }
    return entry;
  });

  return {
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    rooms,
    currency: params.currency || "INR",
    correlationId: params.correlationId || generateHotelCorrelationId(),
    nationality: params.nationality || "106",
    timeoutMs: params.timeoutMs ?? 13000,
    hids: params.hids.map(Number).filter((n) => Number.isFinite(n) && n > 0),
  };
}

export async function listTripJackHotels(
  params: HotelListingSearchParams
): Promise<HotelListingResult> {
  const { listingUrl } = getTripJackHotelProxyConfig();
  const body = buildHotelListingBody(params);

  if (!body.hids.length) {
    throw new TripJackHotelApiError("At least one hotel ID (hid) is required for Phase 1 listing", 400);
  }

  const response = await fetch(listingUrl, {
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
    throw new TripJackHotelApiError(
      "Invalid JSON from TripJack hotel listing proxy",
      response.status,
      rawText,
      listingUrl
    );
  }

  const record = raw as Record<string, unknown>;
  if (!response.ok || record.success === false) {
    throw new TripJackHotelApiError(
      String(record.error ?? record.message ?? `Hotel listing proxy error ${response.status}`),
      response.status,
      raw,
      String(record.upstreamUrl ?? listingUrl)
    );
  }

  const normalized = normalizeTripJackHotelListing(raw);

  return {
    correlationId: normalized.correlationId || body.correlationId,
    nationality: normalized.nationality || body.nationality,
    currency: normalized.currency || body.currency,
    totalResults: normalized.totalResults,
    hotels: normalized.hotels,
    rawResponse: raw,
  };
}
