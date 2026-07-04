export interface HotelRoomRequest {
  adults: number;
  children?: number;
  childAge?: number[];
}

export interface HotelListingSearchParams {
  checkIn: string;
  checkOut: string;
  rooms: HotelRoomRequest[];
  currency: string;
  nationality: string;
  correlationId?: string;
  timeoutMs?: number;
  /** Comma-separated or array of TripJack hotel IDs (hids). Required for Phase 1 listing. */
  hids: number[];
  destinationLabel?: string;
}

export interface HotelListingRequestBody {
  checkIn: string;
  checkOut: string;
  rooms: HotelRoomRequest[];
  currency: string;
  correlationId: string;
  nationality: string;
  timeoutMs: number;
  hids: number[];
}

export interface NormalizedHotelPricing {
  totalPrice: number;
  basePrice: number;
  discount: number;
  taxes: number;
  mf: number;
  mft: number;
  currency: string;
}

export interface NormalizedHotelOption {
  optionId: string;
  optionType: string;
  roomInfo: string[];
  inclusions: string[];
  mealBasis: string;
  pricing: NormalizedHotelPricing;
  commercialType: string;
  commission: number;
  gstType: string;
  panRequired: boolean;
  passportRequired: boolean;
  isRefundable: boolean;
  penalties: unknown[];
  rawOption: unknown;
}

export interface NormalizedHotel {
  tjHotelId: string | number;
  name: string;
  cheapestTotalPrice: number;
  cheapestBasePrice: number;
  cheapestTaxes: number;
  cheapestMf: number;
  cheapestMft: number;
  currency: string;
  mealBasis: string;
  inclusions: string[];
  isRefundable: boolean;
  panRequired: boolean;
  passportRequired: boolean;
  options: NormalizedHotelOption[];
  cheapestOption: NormalizedHotelOption | null;
}

export interface HotelListingResult {
  correlationId: string;
  nationality: string;
  currency: string;
  totalResults: number;
  hotels: NormalizedHotel[];
  rawResponse: unknown;
}
