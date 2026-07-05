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
export const MAX_LISTING_HIDS = 100;
export const MAX_HOTEL_ROOMS = 9;
