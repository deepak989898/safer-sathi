import type { Hotel, Locale, TourPackage, Vehicle } from "@/types";

export type IndiaRegion = "north" | "south" | "other";

export interface UserLocationInfo {
  country?: string;
  state?: string;
  city?: string;
  timezone?: string;
  ip?: string;
  region?: IndiaRegion;
  source?: "ip" | "browser" | "saved" | "default";
}

export interface AITravelPreferences {
  preferredLanguage: "hindi" | "english";
  /** Optional spoken language (Tamil, Gujarati, etc.) — replies stay Hindi/English */
  nativeLanguage?: string;
  preferredBudget?: number;
  favouriteDestinations?: string[];
  tripStyle?: string;
  hotelCategory?: string;
  vehiclePreference?: string;
  lastCity?: string;
  lastState?: string;
  lastCountry?: string;
  updatedAt?: string;
}

export type TravelManagerStep =
  | "welcome"
  | "destination"
  | "pickup_city"
  | "trip_type"
  | "activities"
  | "guests"
  | "budget"
  | "duration"
  | "package_tiers"
  | "customize"
  | "package_review"
  | "hotel_destination"
  | "hotel_dates"
  | "hotel_budget"
  | "hotel_results"
  | "vehicle_passengers"
  | "vehicle_results"
  | "booking_form"
  | "payment"
  | "confirmed";

export type TripIntent =
  | "tour_packages"
  | "custom_package"
  | "hotel_only"
  | "vehicle_only"
  | "bus_booking"
  | "international"
  | "custom_tour"
  | "general";

export interface TravelManagerState {
  step: TravelManagerStep;
  intent: TripIntent;
  destination?: string;
  tripType?: string;
  selectedActivities: string[];
  guests?: number;
  budget?: number;
  durationDays?: number;
  pickupCity?: string;
  travelDate?: string;
  specialRequest?: string;
  hotelBudgetTier?: string;
  selectedHotelId?: string;
  selectedVehicleId?: string;
  selectedRoomType?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  bookingId?: string;
  selectedTierId?: string;
  checkOutDate?: string;
  customizeFlags?: {
    removeHotel?: boolean;
    removeVehicle?: boolean;
    extraNights?: number;
    addGuide?: boolean;
    addAirportPickup?: boolean;
  };
  userLocation?: UserLocationInfo;
  memory?: Partial<AITravelPreferences>;
}

export interface QuickReply {
  id: string;
  label: string;
  value: string;
  variant?: "default" | "card";
}

export interface CustomPackageLineItem {
  label: string;
  detail: string;
  amount: number;
}

export interface CustomPackageQuote {
  title: string;
  destination: string;
  durationDays: number;
  guests: number;
  hotel?: {
    id: string;
    name: string;
    starRating: number;
    roomType: string;
    pricePerNight: number;
    total: number;
    image?: string;
  };
  vehicle?: {
    id: string;
    name: string;
    pricePerDay: number;
    pricePerKm?: number;
    total: number;
    image?: string;
  };
  activities: { id: string; name: string; price: number }[];
  meals: string[];
  pickup?: string;
  lineItems: CustomPackageLineItem[];
  totalAmount: number;
  serviceId: string;
  notes: string;
}

export interface TravelManagerResponse {
  reply: string;
  locale: Locale;
  state: TravelManagerState;
  quickReplies: QuickReply[];
  packageQuote?: CustomPackageQuote;
  packageTiers?: import("@/lib/ai/travel-manager/package-tier-builder").TierPackageQuote[];
  hotels?: Hotel[];
  vehicles?: Vehicle[];
  packages?: TourPackage[];
  provider: "openai" | "gemini" | "rule-based";
}
