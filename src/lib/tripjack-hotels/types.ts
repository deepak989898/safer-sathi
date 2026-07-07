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
  /** Resolved server-side from destination — never required from customer UI. */
  hids?: number[];
  /** Customer-facing destination query (city / hotel name). */
  destination?: string;
  destinationLabel?: string;
  /** Super-admin manual override for TripJack test hids. */
  adminOverrideHids?: number[];
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
  /** Original/list price when API provides it — show strikethrough in UI. */
  strikethroughPrice?: number;
}

export interface CancellationPenalty {
  from?: string;
  to?: string;
  amount: number;
  currency: string;
  label: string;
}

export interface NormalizedHotelOption {
  optionId: string;
  optionType: string;
  roomName: string;
  roomType: string;
  ratePlan: string;
  roomInfo: string[];
  roomImages: string[];
  roomCapacity: string;
  roomFeatures: string[];
  inclusions: string[];
  mealBasis: string;
  mealBasisLabel: string;
  bookingNotes: string[];
  pricing: NormalizedHotelPricing;
  commercialType: string;
  commission: number;
  /** Internal only — never show commission to customer UI. */
  commercial: Record<string, unknown>;
  gstType: string;
  panRequired: boolean;
  passportRequired: boolean;
  isRefundable: boolean;
  freeCancellationUntil: string;
  penalties: CancellationPenalty[];
  rawOption: unknown;
}

export interface NormalizedHotel {
  tjHotelId: string | number;
  name: string;
  starRating?: number | null;
  imageUrl?: string;
  images?: unknown;
  imageUrls?: string[];
  heroImage?: string;
  imageCaption?: string;
  staticContent?: { images?: unknown };
  location?: string;
  hasBreakfast?: boolean;
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

export interface HotelDetailRequestBody {
  correlationId: string;
  hotelId: number | string;
  checkIn: string;
  checkOut: string;
  rooms: HotelRoomRequest[];
  currency: string;
  nationality: string;
  timeoutMs?: number;
}

/** TripJack v3 Hotel Pricing API request body. */
export interface HotelPricingRequestBody {
  correlationId: string;
  hid: number;
  checkIn: string;
  checkOut: string;
  rooms: HotelRoomRequest[];
  currency: string;
  nationality: string;
  timeoutMs: number;
}

export interface NormalizedHotelDetail {
  correlationId: string;
  hotelId: string | number;
  name: string;
  reviewHash: string;
  location: string;
  starRating: number | null;
  amenities: string[];
  description: string;
  images: string[];
  checkIn: string;
  checkOut: string;
  guestSummary: string;
  bookingNotes: string[];
  options: NormalizedHotelOption[];
  currency: string;
  nationality: string;
  fetchedAt: string;
  expiresAt: string;
}

/** Session payload prepared for Review API (Phase 3). */
export interface HotelReviewPrepSession {
  correlationId: string;
  hotelId: string | number;
  reviewHash: string;
  selectedOptionId: string;
  selectedOption: NormalizedHotelOption;
  hotelName: string;
  pricing: NormalizedHotelPricing;
  cancellation: {
    isRefundable: boolean;
    freeCancellationUntil: string;
    penalties: CancellationPenalty[];
  };
  roomInfo: string[];
  mealBasis: string;
  bookingNotes: string[];
  commercial: Record<string, unknown>;
  compliance: {
    gstType: string;
    panRequired: boolean;
    passportRequired: boolean;
  };
  searchContext: {
    checkIn: string;
    checkOut: string;
    rooms: HotelRoomRequest[];
    currency: string;
    nationality: string;
  };
  savedAt: string;
  expiresAt: string;
}

/** TripJack v3 Hotel Review API request body. */
export interface HotelReviewRequestBody {
  correlationId: string;
  optionId: string;
  reviewHash: string;
  hid: number | string;
}

/** Normalized Review API result — source of truth before guest/payment. */
export interface NormalizedHotelReviewResult {
  correlationId: string;
  tjHotelId: string | number;
  hotelName: string;
  bookingId: string;
  reviewHash?: string;
  option: NormalizedHotelOption;
  deadlineDateTime: string;
  onHoldAllowed: boolean;
  statusSuccess: boolean;
  searchContext: HotelReviewPrepSession["searchContext"];
  reviewedAt: string;
  rawResponse: unknown;
}
