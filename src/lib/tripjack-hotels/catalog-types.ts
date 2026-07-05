export interface TripJackHotelCatalogEntry {
  id: string;
  tjHotelId: number;
  unicaId?: string | number;
  name: string;
  nameLower: string;
  cityName: string;
  cityNameLower: string;
  countryName: string;
  countryCode?: string;
  address: string;
  rating: number | null;
  images: string[];
  facilities: string[];
  geolocation?: { lat?: number; lng?: number };
  propertyType?: string;
  isDeleted: boolean;
  searchBlob: string;
  updatedAt: string;
}

export interface TripJackHotelDestinationIndex {
  id: string;
  type: "city" | "country" | "hotel";
  label: string;
  searchKey: string;
  countryName: string;
  hotelCount: number;
  hids: number[];
  sampleHotelName?: string;
  updatedAt: string;
}

export interface TripJackHotelCatalogMeta {
  lastSyncedAt: string | null;
  totalHotels: number;
  activeHotels: number;
  deletedHotels: number;
  lastSyncNext: string | null;
  syncInProgress: boolean;
  lastNationalitySyncAt?: string | null;
  lastBookingStatusSyncAt?: string | null;
  failedSyncRecords?: number;
}

export interface DestinationSuggestion {
  id: string;
  type: "city" | "country" | "hotel";
  label: string;
  subtitle: string;
  hotelCount: number;
  hids: number[];
}

export interface DestinationResolveResult {
  query: string;
  matchType: "city" | "country" | "hotel" | "mixed" | "none";
  label: string;
  hids: number[];
  totalMatched: number;
  truncated: boolean;
}

export const TRIPJACK_HOTEL_CATALOG_COLLECTION = "tripjackHotelCatalog";
export const TRIPJACK_HOTEL_DESTINATIONS_COLLECTION = "tripjackHotelDestinations";
export const TRIPJACK_HOTEL_CATALOG_META_DOC = "tripjackHotelCatalogMeta/sync";
export const TRIPJACK_HOTEL_SYNC_LOGS_COLLECTION = "tripjackHotelSyncLogs";
export const TRIPJACK_HOTEL_API_LOGS_COLLECTION = "tripjackHotelApiLogs";
export const TRIPJACK_HOTEL_NATIONALITIES_COLLECTION = "tripjackHotelNationalities";
export const TRIPJACK_HOTEL_OPS_META_DOC = "tripjackHotelOpsMeta/settings";
export const MAX_LISTING_HIDS = 100;
export const MAX_HOTEL_ROOMS = 9;

export type TripJackHotelSyncMode =
  | "full"
  | "incremental"
  | "deleted_only"
  | "nationalities"
  | "destinations_only"
  | "booking_status";

export interface TripJackHotelSyncLog {
  id: string;
  mode: TripJackHotelSyncMode;
  startedAt: string;
  completedAt?: string;
  success: boolean;
  actorId: string;
  actorEmail?: string;
  pagesFetched: number;
  hotelsUpserted: number;
  deletedMarked: number;
  destinationsIndexed: number;
  nationalitiesSynced: number;
  failedRecords: number;
  lastSyncNext: string | null;
  errorMessage?: string;
  durationMs?: number;
}

export interface TripJackHotelApiLog {
  id: string;
  endpoint: string;
  method: string;
  requestId?: string;
  correlationId?: string;
  bookingId?: string;
  userId?: string;
  role?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  httpStatus?: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  durationMs?: number;
  createdAt: string;
}

export interface TripJackHotelNationality {
  id: string;
  code: string;
  name: string;
  searchKey: string;
  updatedAt: string;
}

export interface TripJackHotelOpsMeta {
  lastBookingStatusSyncAt: string | null;
  liveBookingEnabled: boolean;
  lastNationalitySyncAt: string | null;
  updatedAt: string;
}
