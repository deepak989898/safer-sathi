import "server-only";

import { getTripJackHotelProxyConfig } from "@/lib/tripjack-hotels/config";
import { tripJackHotelProxyFetch } from "@/lib/tripjack-hotels/api-logging";
import { generateHotelCorrelationId } from "@/lib/tripjack-hotels/correlation";
import { catalogEntryImageUrls } from "@/lib/tripjack-hotels/hotel-images";
import {
  normalizeTripJackHotelDetail,
  normalizeTripJackHotelListing,
  normalizeTripJackHotelReview,
} from "@/lib/tripjack-hotels/normalize";
import type {
  HotelDetailRequestBody,
  HotelListingRequestBody,
  HotelListingResult,
  HotelListingSearchParams,
  HotelPricingRequestBody,
  HotelReviewRequestBody,
  HotelReviewPrepSession,
  HotelRoomRequest,
  NormalizedHotelDetail,
  NormalizedHotelReviewResult,
} from "@/lib/tripjack-hotels/types";
import {
  extractPricingErrorCode,
  mapHotelPricingError,
  sleep,
} from "@/lib/tripjack-hotels/pricing-errors";
import {
  extractReviewErrorCode,
  mapHotelReviewError,
} from "@/lib/tripjack-hotels/review-errors";

export { generateHotelCorrelationId } from "@/lib/tripjack-hotels/correlation";

export class TripJackHotelApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public raw?: unknown,
    public upstreamUrl?: string,
    public errorCode?: string,
    public retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "TripJackHotelApiError";
  }
}

export function buildHotelListingBody(
  params: HotelListingSearchParams
): HotelListingRequestBody {
  if (!params.checkIn || !params.checkOut) {
    throw new TripJackHotelApiError("Check-in and check-out dates are required for hotel listing", 400);
  }

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
    hids: (params.hids ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0),
  };
}

export async function listTripJackHotels(
  params: HotelListingSearchParams
): Promise<HotelListingResult> {
  const { listingUrl } = getTripJackHotelProxyConfig();
  const body = buildHotelListingBody(params);

  if (!body.hids.length) {
    throw new TripJackHotelApiError("At least one hotel ID (hid) is required for listing", 400);
  }

  const { response, rawText } = await tripJackHotelProxyFetch({
    endpoint: "hotels/listing",
    url: listingUrl,
    requestBody: body,
    correlationId: body.correlationId,
  });

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

export function buildHotelPricingBody(input: {
  correlationId: string;
  hid: number | string;
  checkIn: string;
  checkOut: string;
  rooms: HotelRoomRequest[];
  currency: string;
  nationality: string;
  timeoutMs?: number;
}): HotelPricingRequestBody {
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

  const hidNum = Number(input.hid);
  return {
    correlationId: input.correlationId,
    hid: Number.isFinite(hidNum) ? hidNum : Number(String(input.hid).replace(/\D/g, "")),
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    rooms,
    currency: input.currency || "INR",
    nationality: input.nationality || "106",
    timeoutMs: input.timeoutMs ?? 13000,
  };
}

async function callHotelPricingProxy(
  body: HotelPricingRequestBody,
  pricingUrl: string
): Promise<{ raw: unknown; elapsedMs: number; retryAfter?: string | null }> {
  const started = Date.now();
  const { response, rawText } = await tripJackHotelProxyFetch({
    endpoint: "hotels/pricing",
    url: pricingUrl,
    requestBody: body,
    correlationId: body.correlationId,
  });

  const elapsedMs = Date.now() - started;
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new TripJackHotelApiError(
      "Invalid JSON from TripJack hotel pricing proxy",
      response.status,
      rawText,
      pricingUrl
    );
  }

  const record = raw as Record<string, unknown>;
  if (!response.ok || record.success === false) {
    const mapped = mapHotelPricingError({
      raw,
      httpStatus: response.status,
      fallbackMessage: String(record.error ?? record.message ?? `Hotel pricing proxy error ${response.status}`),
      retryAfterHeader: response.headers.get("retry-after"),
    });
    throw new TripJackHotelApiError(
      mapped.message,
      response.status,
      raw,
      String(record.upstreamUrl ?? pricingUrl),
      mapped.code,
      mapped.retryAfterSeconds
    );
  }

  return {
    raw,
    elapsedMs: Number(record.elapsedMs) || elapsedMs,
    retryAfter: response.headers.get("retry-after"),
  };
}

export async function fetchTripJackHotelPricing(input: {
  correlationId: string;
  hid: number | string;
  checkIn: string;
  checkOut: string;
  rooms: HotelRoomRequest[];
  currency: string;
  nationality: string;
  listingHotelName?: string;
  catalogEnrichment?: {
    name?: string;
    address?: string;
    cityName?: string;
    countryName?: string;
    rating?: number | null;
    imageUrls?: string[];
    heroImage?: string;
    images?: unknown[];
    facilities?: string[];
  };
}): Promise<{ detail: NormalizedHotelDetail; elapsedMs?: number; requestBody: HotelPricingRequestBody; rawResponse: unknown }> {
  const { pricingUrl } = getTripJackHotelProxyConfig();
  const body = buildHotelPricingBody(input);
  const retryDelays = [1000, 2000, 4000];

  console.log("[tripjack-hotels] pricing request:", {
    url: pricingUrl,
    correlationId: body.correlationId,
    hid: body.hid,
  });

  let lastError: TripJackHotelApiError | null = null;
  let raw: unknown;
  let elapsedMs = 0;

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      const result = await callHotelPricingProxy(body, pricingUrl);
      raw = result.raw;
      elapsedMs = result.elapsedMs;
      lastError = null;
      break;
    } catch (error) {
      if (!(error instanceof TripJackHotelApiError)) throw error;
      lastError = error;
      const code = error.errorCode ?? extractPricingErrorCode(error.raw, error.statusCode);
      if (code !== "SUPPLIER_UNAVAILABLE" || attempt >= retryDelays.length) {
        throw error;
      }
      console.warn(`[tripjack-hotels] SUPPLIER_UNAVAILABLE retry ${attempt + 1}/${retryDelays.length}`);
      await sleep(retryDelays[attempt]);
    }
  }

  if (lastError) throw lastError;

  console.log("[tripjack-hotels] pricing response time ms:", elapsedMs);

  const detail = normalizeTripJackHotelDetail(raw, {
    correlationId: body.correlationId,
    hotelId: body.hid,
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    rooms: body.rooms,
    currency: body.currency,
    nationality: body.nationality,
    listingHotelName: input.listingHotelName ?? input.catalogEnrichment?.name,
  });

  if (!detail) {
    throw new TripJackHotelApiError("Could not parse hotel pricing response", 502, raw, pricingUrl);
  }

  if (input.catalogEnrichment) {
    if (input.catalogEnrichment.address || input.catalogEnrichment.cityName) {
      detail.location =
        detail.location ||
        [input.catalogEnrichment.address, input.catalogEnrichment.cityName, input.catalogEnrichment.countryName]
          .filter(Boolean)
          .join(", ");
    }
    if (input.catalogEnrichment.rating != null && detail.starRating == null) {
      detail.starRating = input.catalogEnrichment.rating;
    }
    const catalogUrls = input.catalogEnrichment.imageUrls?.length
      ? [...input.catalogEnrichment.imageUrls]
      : catalogEntryImageUrls({
          imageUrls: input.catalogEnrichment.imageUrls,
          heroImage: input.catalogEnrichment.heroImage,
          images: input.catalogEnrichment.images,
        });
    if (input.catalogEnrichment.heroImage) {
      const hero = input.catalogEnrichment.heroImage;
      const merged = [hero, ...catalogUrls.filter((url) => url !== hero)];
      if (merged.length) {
        detail.images = [...new Set([...merged, ...detail.images])];
      }
    } else if (catalogUrls.length) {
      detail.images = [...new Set([...catalogUrls, ...detail.images])];
    }
    if (!detail.amenities.length && input.catalogEnrichment.facilities?.length) {
      detail.amenities = input.catalogEnrichment.facilities;
    }
    if (input.catalogEnrichment.name && detail.name === "Hotel") {
      detail.name = input.catalogEnrichment.name;
    }
  }

  if (!detail.options.length) {
    throw new TripJackHotelApiError(
      "No rooms available for this hotel on selected dates.",
      404,
      raw,
      pricingUrl,
      "INVALID_HOTEL_ID"
    );
  }

  return { detail, elapsedMs, requestBody: body, rawResponse: raw };
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

  const { response, rawText } = await tripJackHotelProxyFetch({
    endpoint: "hotels/detail",
    url: detailUrl,
    requestBody: body,
    correlationId: body.correlationId,
  });

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

export function buildHotelReviewBody(input: {
  correlationId: string;
  optionId: string;
  reviewHash: string;
  hid: number | string;
}): HotelReviewRequestBody {
  const hidNum = Number(input.hid);
  return {
    correlationId: input.correlationId,
    optionId: input.optionId,
    reviewHash: input.reviewHash,
    hid: Number.isFinite(hidNum) ? hidNum : input.hid,
  };
}

async function callHotelReviewProxy(
  body: HotelReviewRequestBody,
  reviewUrl: string
): Promise<{ raw: unknown; elapsedMs: number }> {
  const started = Date.now();
  const { response, rawText } = await tripJackHotelProxyFetch({
    endpoint: "hotels/review",
    url: reviewUrl,
    requestBody: body,
    correlationId: body.correlationId,
  });

  const elapsedMs = Date.now() - started;
  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch {
    throw new TripJackHotelApiError(
      "Invalid JSON from TripJack hotel review proxy",
      response.status,
      rawText,
      reviewUrl
    );
  }

  const record = raw as Record<string, unknown>;
  if (!response.ok || record.success === false) {
    const mapped = mapHotelReviewError({
      raw,
      httpStatus: response.status,
      fallbackMessage: String(record.error ?? record.message ?? `Hotel review proxy error ${response.status}`),
      retryAfterHeader: response.headers.get("retry-after"),
    });
    throw new TripJackHotelApiError(
      mapped.message,
      response.status,
      raw,
      String(record.upstreamUrl ?? reviewUrl),
      mapped.code,
      mapped.retryAfterSeconds
    );
  }

  return {
    raw,
    elapsedMs: Number(record.elapsedMs) || elapsedMs,
  };
}

export async function fetchTripJackHotelReview(input: {
  correlationId: string;
  optionId: string;
  reviewHash: string;
  hid: number | string;
  hotelName?: string;
  searchContext: HotelReviewPrepSession["searchContext"];
}): Promise<{
  review: NormalizedHotelReviewResult;
  elapsedMs?: number;
  requestBody: HotelReviewRequestBody;
  rawResponse: unknown;
}> {
  const { reviewUrl } = getTripJackHotelProxyConfig();
  const body = buildHotelReviewBody(input);
  const retryDelays = [1000, 2000, 4000];

  console.log("[tripjack-hotels] review request:", {
    url: reviewUrl,
    correlationId: body.correlationId,
    optionId: body.optionId,
    hid: body.hid,
  });

  let raw: unknown;
  let elapsedMs = 0;

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      const result = await callHotelReviewProxy(body, reviewUrl);
      raw = result.raw;
      elapsedMs = result.elapsedMs;
      break;
    } catch (error) {
      if (!(error instanceof TripJackHotelApiError)) throw error;
      const code = error.errorCode ?? extractReviewErrorCode(error.raw, error.statusCode);
      if (code !== "SUPPLIER_UNAVAILABLE" || attempt >= retryDelays.length) {
        throw error;
      }
      console.warn(`[tripjack-hotels] review SUPPLIER_UNAVAILABLE retry ${attempt + 1}/${retryDelays.length}`);
      await sleep(retryDelays[attempt]);
    }
  }

  const review = normalizeTripJackHotelReview(raw!, {
    correlationId: body.correlationId,
    hid: body.hid,
    hotelName: input.hotelName,
    searchContext: input.searchContext,
  });

  if (!review) {
    throw new TripJackHotelApiError(
      "Could not parse hotel review response",
      502,
      raw,
      reviewUrl,
      "UNKNOWN"
    );
  }

  if (!review.statusSuccess) {
    throw new TripJackHotelApiError(
      "Hotel review was not successful",
      502,
      raw,
      reviewUrl,
      "UNKNOWN"
    );
  }

  return { review, elapsedMs, requestBody: body, rawResponse: raw! };
}

export async function bookTripJackHotel(
  body: import("@/lib/tripjack-hotels/build-book").TripJackHotelBookRequest
): Promise<{ rawResponse: unknown; upstreamUrl: string }> {
  const { bookUrl } = getTripJackHotelProxyConfig();
  const retryDelays = [1000, 2000, 4000];

  console.log("[tripjack-hotels] book request:", { url: bookUrl, bookingId: body.bookingId });

  let lastError: TripJackHotelApiError | null = null;
  let raw: unknown;

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      const { response, rawText } = await tripJackHotelProxyFetch({
        endpoint: "hotels/book",
        url: bookUrl,
        requestBody: body,
        bookingId: body.bookingId,
      });

      try {
        raw = JSON.parse(rawText);
      } catch {
        throw new TripJackHotelApiError(
          "Invalid JSON from TripJack hotel book proxy",
          response.status,
          rawText,
          bookUrl
        );
      }

      const record = raw as Record<string, unknown>;
      if (!response.ok || record.success === false) {
        const mapped = mapHotelReviewError({
          raw,
          httpStatus: response.status,
          fallbackMessage: String(record.error ?? record.message ?? `Hotel book error ${response.status}`),
        });
        throw new TripJackHotelApiError(
          mapped.message,
          response.status,
          raw,
          String(record.upstreamUrl ?? bookUrl),
          mapped.code
        );
      }

      console.log("[tripjack-hotels] book response status:", response.status);
      return { rawResponse: raw, upstreamUrl: String(record.upstreamUrl ?? bookUrl) };
    } catch (error) {
      if (!(error instanceof TripJackHotelApiError)) throw error;
      lastError = error;
      const code = error.errorCode ?? extractReviewErrorCode(error.raw, error.statusCode);
      if (code !== "SUPPLIER_UNAVAILABLE" || attempt >= retryDelays.length) throw error;
      await sleep(retryDelays[attempt]);
    }
  }

  if (lastError) throw lastError;
  throw new TripJackHotelApiError("Hotel book failed", 502, raw, bookUrl);
}

async function callHotelPostBookingProxy(
  url: string,
  body: Record<string, unknown>,
  label: string
): Promise<{ rawResponse: unknown; upstreamUrl: string; httpStatus?: number }> {
  const retryDelays = [1000, 2000, 4000];
  let lastError: TripJackHotelApiError | null = null;
  let raw: unknown;

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      const { response, rawText } = await tripJackHotelProxyFetch({
        endpoint: `hotels/${label}`,
        url,
        requestBody: body,
        bookingId: typeof body.bookingId === "string" ? body.bookingId : undefined,
      });

      try {
        raw = JSON.parse(rawText);
      } catch {
        throw new TripJackHotelApiError(
          `Invalid JSON from TripJack hotel ${label} proxy`,
          response.status,
          rawText,
          url
        );
      }

      const record = raw as Record<string, unknown>;
      if (!response.ok || record.success === false) {
        const mapped = mapHotelReviewError({
          raw,
          httpStatus: response.status,
          fallbackMessage: String(
            record.error ?? record.message ?? `Hotel ${label} proxy error ${response.status}`
          ),
        });
        throw new TripJackHotelApiError(
          mapped.message,
          response.status,
          raw,
          String(record.upstreamUrl ?? url),
          mapped.code
        );
      }

      return {
        rawResponse: raw,
        upstreamUrl: String(record.upstreamUrl ?? url),
        httpStatus: response.status,
      };
    } catch (error) {
      if (!(error instanceof TripJackHotelApiError)) throw error;
      lastError = error;
      const code = error.errorCode ?? extractReviewErrorCode(error.raw, error.statusCode);
      if (code !== "SUPPLIER_UNAVAILABLE" || attempt >= retryDelays.length) throw error;
      await sleep(retryDelays[attempt]);
    }
  }

  if (lastError) throw lastError;
  throw new TripJackHotelApiError(`Hotel ${label} failed`, 502, raw, url);
}

export async function fetchTripJackHotelBookingDetails(tripjackBookingId: string) {
  const { bookingDetailsUrl } = getTripJackHotelProxyConfig();
  console.log("[tripjack-hotels] booking-details request:", {
    url: bookingDetailsUrl,
    bookingId: tripjackBookingId,
  });
  return callHotelPostBookingProxy(
    bookingDetailsUrl,
    { bookingId: tripjackBookingId },
    "booking-details"
  );
}

export async function cancelTripJackHotelBooking(input: {
  bookingId: string;
  remarks?: string;
}) {
  const { cancelBookingUrl } = getTripJackHotelProxyConfig();
  console.log("[tripjack-hotels] cancel-booking request:", {
    url: cancelBookingUrl,
    bookingId: input.bookingId,
  });
  return callHotelPostBookingProxy(
    cancelBookingUrl,
    { bookingId: input.bookingId, remarks: input.remarks ?? "Customer requested cancellation" },
    "cancel-booking"
  );
}
