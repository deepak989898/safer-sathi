import { getTripJackHotelProxyConfig } from "@/lib/tripjack-hotels/config";
import {
  normalizeTripJackHotelDetail,
  normalizeTripJackHotelListing,
} from "@/lib/tripjack-hotels/normalize";
import type {
  HotelDetailRequestBody,
  HotelListingRequestBody,
  HotelListingResult,
  HotelListingSearchParams,
  HotelRoomRequest,
  NormalizedHotelDetail,
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

export function buildHotelDetailBody(input: {
  correlationId: string;
  hotelId: number | string;
  checkIn: string;
  checkOut: string;
  rooms: HotelRoomRequest[];
  currency: string;
  nationality: string;
  timeoutMs?: number;
}): HotelDetailRequestBody {
  const rooms = input.rooms.map((room) => {
    const adults = Math.max(1, Number(room.adults) || 1);
    const children = Math.max(0, Number(room.children) || 0);
    const entry: HotelRoomRequest = { adults };
    if (children > 0) {
      entry.children = children;
      entry.childAge = (room.childAge ?? []).slice(0, children).map((age) => Number(age) || 1);
      while ((entry.childAge?.length ?? 0) < children) {
        entry.childAge = [...(entry.childAge ?? []), 5];
      }
    }
    return entry;
  });

  const hotelIdNum = Number(input.hotelId);
  return {
    correlationId: input.correlationId,
    hotelId: Number.isFinite(hotelIdNum) ? hotelIdNum : input.hotelId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    rooms,
    currency: input.currency || "INR",
    nationality: input.nationality || "106",
    timeoutMs: input.timeoutMs ?? 13000,
  };
}

export async function fetchTripJackHotelDetail(input: {
  correlationId: string;
  hotelId: number | string;
  checkIn: string;
  checkOut: string;
  rooms: HotelRoomRequest[];
  currency: string;
  nationality: string;
  listingHotelName?: string;
}): Promise<{ detail: NormalizedHotelDetail; elapsedMs?: number; requestBody: HotelDetailRequestBody }> {
  const { detailUrl } = getTripJackHotelProxyConfig();
  const body = buildHotelDetailBody(input);
  const started = Date.now();

  console.log("[tripjack-hotels] detail request:", {
    url: detailUrl,
    correlationId: body.correlationId,
    hotelId: body.hotelId,
  });

  const response = await fetch(detailUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const rawText = await response.text();
  const elapsedMs = Date.now() - started;
  console.log("[tripjack-hotels] detail response time ms:", elapsedMs, "status:", response.status);

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new TripJackHotelApiError(
      "Invalid JSON from TripJack hotel detail proxy",
      response.status,
      rawText,
      detailUrl
    );
  }

  const record = raw as Record<string, unknown>;
  if (!response.ok || record.success === false) {
    const message = String(
      record.error ?? record.message ?? `Hotel detail proxy error ${response.status}`
    );
    const lower = message.toLowerCase();
    let friendly = message;
    if (lower.includes("sold out") || lower.includes("no room")) {
      friendly = "No rooms available for this hotel on selected dates.";
    } else if (lower.includes("price") && lower.includes("chang")) {
      friendly = "Price has changed. Please search again.";
    } else if (lower.includes("timeout")) {
      friendly = "Hotel detail request timed out. Please retry.";
    }
    throw new TripJackHotelApiError(
      friendly,
      response.status,
      raw,
      String(record.upstreamUrl ?? detailUrl)
    );
  }

  const detail = normalizeTripJackHotelDetail(raw, {
    correlationId: body.correlationId,
    hotelId: body.hotelId,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    rooms: body.rooms,
    currency: body.currency,
    nationality: body.nationality,
    listingHotelName: input.listingHotelName,
  });

  if (!detail) {
    throw new TripJackHotelApiError("Could not parse hotel detail response", 502, raw, detailUrl);
  }

  if (!detail.options.length) {
    throw new TripJackHotelApiError(
      "No rooms available for this hotel on selected dates.",
      404,
      raw,
      detailUrl
    );
  }

  return {
    detail,
    elapsedMs: Number(record.elapsedMs) || elapsedMs,
    requestBody: body,
  };
}
