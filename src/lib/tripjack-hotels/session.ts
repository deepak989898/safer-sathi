import type {
  HotelListingSearchParams,
  NormalizedHotel,
  NormalizedHotelOption,
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
  // Store lightweight listing only (no huge raw payloads)
  saveJson(HOTEL_SESSION_KEYS.listingResponse, {
    correlationId: input.correlationId,
    totalResults: input.totalResults,
    currency: input.currency,
    nationality: input.nationality,
    hotels: input.hotels,
  });
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
}

export function loadSelectedHotelOption(): {
  hotel: NormalizedHotel | null;
  option: NormalizedHotelOption | null;
} {
  return {
    hotel: loadJson<NormalizedHotel>(HOTEL_SESSION_KEYS.selectedHotel),
    option: loadJson<NormalizedHotelOption>(HOTEL_SESSION_KEYS.selectedOption),
  };
}
