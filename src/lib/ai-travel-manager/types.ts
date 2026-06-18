import type {
  LocalizedString,
  PackageCategory,
  PackagePublishStatus,
  TourPackage,
  Vehicle,
  VehicleType,
} from "@/types";

export type AIApprovalStatus =
  | "draft"
  | "manager_review"
  | "pending_approval"
  | "published"
  | "rejected";

export interface AICompetitorData {
  id: string;
  websiteUrl: string;
  websiteName: string;
  packageName: string;
  destination: string;
  duration: string;
  price: number;
  hotels: string[];
  vehicles: string[];
  itinerary: string[];
  inclusions: string[];
  exclusions: string[];
  tourHighlights: string[];
  bestTimeToVisit: string;
  faqs: { question: string; answer: string }[];
  analyzedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIPriceBreakdown {
  hotelCost: number;
  vehicleCost: number;
  driverCost: number;
  guideCost: number;
  foodCost: number;
  taxes: number;
  profitMargin: number;
  profitPercent: number;
  basePrice: number;
  discountPrice: number;
  finalSellingPrice: number;
}

export interface AIGeneratedImage {
  id: string;
  type:
    | "package_cover"
    | "destination_banner"
    | "hotel_promo"
    | "vehicle_banner"
    | "social_media";
  url: string;
  relatedId: string;
  prompt: string;
  createdAt: string;
}

export interface AIPackageDraft extends TourPackage {
  approvalStatus: AIApprovalStatus;
  competitorId?: string;
  seoSlug: string;
  termsAndConditions: LocalizedString;
  cancellationPolicy: LocalizedString;
  faqs: { question: LocalizedString; answer: LocalizedString }[];
  tourHighlights: LocalizedString[];
  bestSeason: LocalizedString;
  tags: string[];
  priceBreakdown?: AIPriceBreakdown;
  generatedImages?: AIGeneratedImage[];
  managerReviewedBy?: string;
  managerReviewedAt?: string;
  managerNotes?: string;
  regeneratedAt?: string;
}

export interface AIVehicleDraft extends Vehicle {
  approvalStatus: AIApprovalStatus;
  category: VehicleType;
  generatedImages?: AIGeneratedImage[];
  managerReviewedBy?: string;
  managerReviewedAt?: string;
  managerNotes?: string;
  proposedBy: "ai_travel_manager";
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface AIHotelRoomDraft {
  id: string;
  name: LocalizedString;
  type: string;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
}

export interface AIHotelDraft {
  id: string;
  name: LocalizedString;
  slug: string;
  category: string;
  location: string;
  city: string;
  starRating: number;
  description: LocalizedString;
  amenities: string[];
  rooms: AIHotelRoomDraft[];
  priceFrom: number;
  includedFacilities: string[];
  images: string[];
  approvalStatus: AIApprovalStatus;
  generatedImages?: AIGeneratedImage[];
  managerReviewedBy?: string;
  managerReviewedAt?: string;
  managerNotes?: string;
  proposedBy: "ai_travel_manager";
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface AITravelManagerStats {
  packagesGeneratedToday: number;
  competitorsAnalyzed: number;
  draftPackages: number;
  publishedPackages: number;
  draftHotels: number;
  draftVehicles: number;
  pendingApprovals: number;
  aiUsageToday: number;
  managerReviewQueue: number;
}

export interface AIChatCommandResult {
  reply: string;
  action?: string;
  packageDraft?: AIPackageDraft;
  vehicleDraft?: AIVehicleDraft;
  hotelDraft?: AIHotelDraft;
  provider: string;
}

export type DraftEntityType = "package" | "vehicle" | "hotel";
