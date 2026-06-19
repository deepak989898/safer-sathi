import type { Hotel, Locale, TourPackage, Vehicle } from "@/types";

export type TravelManagerStep =
  | "welcome"
  | "destination"
  | "trip_type"
  | "activities"
  | "guests"
  | "budget"
  | "duration"
  | "package_review"
  | "hotel_budget"
  | "hotel_results"
  | "vehicle_results"
  | "booking_form"
  | "payment"
  | "confirmed";

export type TripIntent =
  | "custom_package"
  | "hotel_only"
  | "vehicle_only"
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
}

export interface QuickReply {
  id: string;
  label: string;
  value: string;
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
  hotels?: Hotel[];
  vehicles?: Vehicle[];
  packages?: TourPackage[];
  provider: "openai" | "gemini" | "rule-based";
}
