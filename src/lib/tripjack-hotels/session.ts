import { HOTEL_SEARCH_SESSION_MS, HOTEL_SESSION_TTL_MS } from "@/lib/tripjack-hotels/config";
import type {
  HotelListingSearchParams,
  HotelReviewPrepSession,
  NormalizedHotel,
  NormalizedHotelDetail,
  NormalizedHotelOption,
  NormalizedHotelReviewResult,
} from "@/lib/tripjack-hotels/types";

export const HOTEL_SESSION_KEYS = {
  searchRequest: "tripjack_hotel_search_request",
  listingResponse: "tripjack_hotel_listing_response",
  correlationId: "tripjack_hotel_correlation_id",
  searchContext: "tripjack_hotel_search_context",
  selectedHotel: "tripjack_selected_hotel",
  selectedOption: "tripjack_selected_hotel_option",
  selectedHotelId: "tripjack_selected_hotel_id",
  selectedOptionId: "tripjack_selected_option_id",
  detailCachePrefix: "tripjack_hotel_detail_",
  reviewPrep: "tripjack_hotel_review_prep",
  reviewResponse: "tripjack_hotel_review_response",
  bookingId: "tripjack_hotel_booking_id",
  finalPrice: "tripjack_hotel_final_price",
  selectedOptionFinal: "tripjack_hotel_selected_option_final",
  sessionMeta: "tripjack_hotel_session_meta",
} as const;

function saveJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota
  }
}

function loadJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function touchSessionMeta(): void {
  const expiresAt = new Date(Date.now() + HOTEL_SESSION_TTL_MS).toISOString();
  saveJson(HOTEL_SESSION_KEYS.sessionMeta, {
    updatedAt: new Date().toISOString(),
    expiresAt,
  });
}

export function getHotelSearchSessionExpiresAt(): string | null {
  const ctx = loadJson<{ searchedAt?: string }>(HOTEL_SESSION_KEYS.searchContext);
  if (!ctx?.searchedAt) return null;
  return new Date(new Date(ctx.searchedAt).getTime() + HOTEL_SEARCH_SESSION_MS).toISOString();
}

export function getHotelSearchSessionRemainingMs(): number {
  const expiresAt = getHotelSearchSessionExpiresAt();
  if (!expiresAt) return 0;
  return Math.max(0, new Date(expiresAt).getTime() - Date.now());
}

function isHotelStorageExpired(): boolean {
  const meta = loadJson<{ expiresAt?: string }>(HOTEL_SESSION_KEYS.sessionMeta);
  if (!meta?.expiresAt) return false;
  return new Date(meta.expiresAt).getTime() < Date.now();
}

export function isHotelSearchSessionExpired(): boolean {
  const ctx = loadJson<{ searchedAt?: string; correlationId?: string }>(
    HOTEL_SESSION_KEYS.searchContext
  );
  if (!ctx?.searchedAt || !ctx.correlationId) return true;
  return getHotelSearchSessionRemainingMs() <= 0;
}

export function clearHotelBookingSession(): void {
  if (typeof window === "undefined") return;
  Object.values(HOTEL_SESSION_KEYS).forEach((key) => {
    if (key === HOTEL_SESSION_KEYS.detailCachePrefix) return;
    sessionStorage.removeItem(key);
  });
  // Clear detail caches
  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(HOTEL_SESSION_KEYS.detailCachePrefix)) {
      sessionStorage.removeItem(key);
    }
  }
}

export function saveHotelListingSession(input: {
  request: HotelListingSearchParams;
  correlationId: string;
  hotels: NormalizedHotel[];
  totalResults: number;
  currency: string;
  nationality: string;
}): void {
  saveJson(HOTEL_SESSION_KEYS.searchRequest, input.request);
  saveJson(HOTEL_SESSION_KEYS.correlationId, input.correlationId);
  saveJson(HOTEL_SESSION_KEYS.searchContext, {
    checkIn: input.request.checkIn,
    checkOut: input.request.checkOut,
    rooms: input.request.rooms,
    currency: input.currency,
    nationality: input.nationality,
    hids: input.request.hids,
    destinationLabel: input.request.destinationLabel ?? "",
    correlationId: input.correlationId,
    searchedAt: new Date().toISOString(),
  });
  saveJson(HOTEL_SESSION_KEYS.listingResponse, {
    correlationId: input.correlationId,
    totalResults: input.totalResults,
    currency: input.currency,
    nationality: input.nationality,
    hotels: input.hotels,
  });
  touchSessionMeta();
}

export function loadHotelListingSession(): {
  request: HotelListingSearchParams | null;
  correlationId: string;
  hotels: NormalizedHotel[];
  totalResults: number;
  currency: string;
  nationality: string;
  searchContext: Record<string, unknown> | null;
} {
  if (isHotelStorageExpired()) {
    clearHotelBookingSession();
    return {
      request: null,
      correlationId: "",
      hotels: [],
      totalResults: 0,
      currency: "INR",
      nationality: "106",
      searchContext: null,
    };
  }

  const listing = loadJson<{
    correlationId?: string;
    totalResults?: number;
    currency?: string;
    nationality?: string;
    hotels?: NormalizedHotel[];
  }>(HOTEL_SESSION_KEYS.listingResponse);

  return {
    request: loadJson<HotelListingSearchParams>(HOTEL_SESSION_KEYS.searchRequest),
    correlationId:
      loadJson<string>(HOTEL_SESSION_KEYS.correlationId) || listing?.correlationId || "",
    hotels: listing?.hotels ?? [],
    totalResults: listing?.totalResults ?? listing?.hotels?.length ?? 0,
    currency: listing?.currency ?? "INR",
    nationality: listing?.nationality ?? "106",
    searchContext: loadJson(HOTEL_SESSION_KEYS.searchContext),
  };
}

export function saveSelectedHotelOption(input: {
  hotel: NormalizedHotel;
  option: NormalizedHotelOption;
}): void {
  saveJson(HOTEL_SESSION_KEYS.selectedHotel, input.hotel);
  saveJson(HOTEL_SESSION_KEYS.selectedOption, input.option);
  saveJson(HOTEL_SESSION_KEYS.selectedHotelId, input.hotel.tjHotelId);
  saveJson(HOTEL_SESSION_KEYS.selectedOptionId, input.option.optionId);
  touchSessionMeta();
}

export function loadSelectedHotelOption(): {
  hotel: NormalizedHotel | null;
  option: NormalizedHotelOption | null;
} {
  if (isHotelStorageExpired()) {
    clearHotelBookingSession();
    return { hotel: null, option: null };
  }
  return {
    hotel: loadJson<NormalizedHotel>(HOTEL_SESSION_KEYS.selectedHotel),
    option: loadJson<NormalizedHotelOption>(HOTEL_SESSION_KEYS.selectedOption),
  };
}

function detailCacheKey(hotelId: string | number): string {
  return `${HOTEL_SESSION_KEYS.detailCachePrefix}${hotelId}`;
}

export function saveHotelDetailCache(detail: NormalizedHotelDetail): void {
  saveJson(detailCacheKey(detail.hotelId), detail);
  touchSessionMeta();
}

export function loadHotelDetailCache(
  hotelId: string | number
): NormalizedHotelDetail | null {
  if (isHotelStorageExpired()) {
    clearHotelBookingSession();
    return null;
  }
  const detail = loadJson<NormalizedHotelDetail>(detailCacheKey(hotelId));
  if (!detail) return null;
  if (detail.expiresAt && new Date(detail.expiresAt).getTime() < Date.now()) {
    sessionStorage.removeItem(detailCacheKey(hotelId));
    return null;
  }
  return detail;
}

export function saveHotelReviewPrep(session: HotelReviewPrepSession): void {
  saveJson(HOTEL_SESSION_KEYS.reviewPrep, session);
  saveJson(HOTEL_SESSION_KEYS.selectedOptionId, session.selectedOptionId);
  saveJson(HOTEL_SESSION_KEYS.selectedHotelId, session.hotelId);
  saveJson(HOTEL_SESSION_KEYS.selectedOption, session.selectedOption);
  touchSessionMeta();
}

export function loadHotelReviewPrep(): HotelReviewPrepSession | null {
  if (isHotelStorageExpired()) {
    clearHotelBookingSession();
    return null;
  }
  const prep = loadJson<HotelReviewPrepSession>(HOTEL_SESSION_KEYS.reviewPrep);
  if (!prep) return null;
  if (prep.expiresAt && new Date(prep.expiresAt).getTime() < Date.now()) {
    sessionStorage.removeItem(HOTEL_SESSION_KEYS.reviewPrep);
    return null;
  }
  return prep;
}

export function saveHotelReviewResult(review: NormalizedHotelReviewResult): void {
  saveJson(HOTEL_SESSION_KEYS.reviewResponse, review);
  saveJson(HOTEL_SESSION_KEYS.bookingId, review.bookingId);
  saveJson(HOTEL_SESSION_KEYS.finalPrice, review.option.pricing);
  saveJson(HOTEL_SESSION_KEYS.selectedOptionFinal, review.option);
  saveJson(HOTEL_SESSION_KEYS.selectedHotelId, review.tjHotelId);
  saveJson(HOTEL_SESSION_KEYS.selectedOptionId, review.option.optionId);
  touchSessionMeta();
}

export function loadHotelReviewResult(): NormalizedHotelReviewResult | null {
  if (isHotelStorageExpired()) {
    clearHotelBookingSession();
    return null;
  }
  return loadJson<NormalizedHotelReviewResult>(HOTEL_SESSION_KEYS.reviewResponse);
}

export function loadHotelReviewBookingId(): string | null {
  if (isHotelStorageExpired()) return null;
  return loadJson<string>(HOTEL_SESSION_KEYS.bookingId);
}

/** Server-safe: validate review session using TripJack deadline or review timestamp. */
export function isHotelReviewExpired(review: NormalizedHotelReviewResult): boolean {
  if (review.deadlineDateTime) {
    const deadline = new Date(review.deadlineDateTime).getTime();
    if (!Number.isNaN(deadline) && Date.now() > deadline) return true;
  }
  if (review.reviewedAt) {
    const reviewed = new Date(review.reviewedAt).getTime();
    if (!Number.isNaN(reviewed) && Date.now() - reviewed > HOTEL_SESSION_TTL_MS) {
      return true;
    }
  }
  return false;
}

/** Server-safe: listing search window from optional searchedAt on review context. */
export function isHotelReviewSearchSessionExpired(
  review: NormalizedHotelReviewResult
): boolean {
  const ctx = review.searchContext as { searchedAt?: string; correlationId?: string };
  if (ctx?.searchedAt) {
    const expires =
      new Date(ctx.searchedAt).getTime() + HOTEL_SEARCH_SESSION_MS;
    if (Date.now() > expires) return true;
  }
  if (!review.correlationId) return true;
  return isHotelReviewExpired(review);
}
