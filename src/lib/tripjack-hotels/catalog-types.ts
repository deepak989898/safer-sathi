export interface TripJackHotelCatalogEntry {
  id: string;
  tjHotelId: number;
  unicaId?: string | number;
  name: string;
  nameLower: string;
  cityName: string;
  cityNameLower: string;
  stateName?: string;
  region?: string;
  countryName: string;
  countryCode?: string;
  address: string;
  rating: number | null;
  starRating?: number | null;
  /** TripJack V3 raw `images[]` objects from content API */
  images?: unknown[];
  /** Legacy string URLs — prefer imageUrls */
  imageUrls: string[];
  heroImage?: string;
  imageCaption?: string;
  facilities: string[];
  policies?: string[];
  geolocation?: { lat?: number; lng?: number };
  propertyType?: string;
  description?: string;
  contact?: string;
  contentSynced?: boolean;
  /** Admin can hide individual TripJack hotels from website search/results */
  websiteVisible?: boolean;
  isActive?: boolean;
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
  lastMappingPage?: number;
  totalMappingIds?: number;
  contentBatchesCompleted?: number;
  contentSuccessCount?: number;
  contentFailedCount?: number;
  failedHotelIds?: string[];
  lastSyncMessage?: string | null;
  contentSyncCursor?: number | null;
  mappingHasMore?: boolean;
  locationBackfillCursor?: number | null;
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
export const TRIPJACK_HOTEL_MANUAL_DESTINATIONS_COLLECTION = "tripjackHotelManualDestinations";
export const MAX_LISTING_HIDS = 100;
export const MAX_HOTEL_CONTENT_BATCH = 100;
export const MAX_HOTEL_MAPPING_PAGE_SIZE = 2000;
export const MAX_HOTEL_ROOMS = 9;

export type TripJackHotelSyncMode =
  | "full"
  | "incremental"
  | "mapping_only"
  | "content_only"
  | "nationalities"
  | "destinations_only"
  | "booking_status"
  | "sync_start"
  | "mapping_page"
  | "content_batch"
  | "sync_finalize"
  | "location_backfill";

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
  mappingPagesFetched?: number;
  mappingIdsFound?: number;
  contentBatchesCompleted?: number;
  contentSuccessCount?: number;
  contentFailedCount?: number;
  failedHotelIds?: string[];
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
