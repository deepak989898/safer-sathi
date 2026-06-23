export type KeywordStatus = "pending" | "approved" | "rejected";
export type BlogStatus = "draft" | "pending_approval" | "approved" | "published" | "rejected";
export type KeywordCategory =
  | "tour_packages"
  | "hotels"
  | "vehicles"
  | "destinations"
  | "travel_guides"
  | "local";

export type AiPackageStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "published"
  | "rejected";

export type AiReportPeriod = "daily" | "weekly" | "monthly";

export type AiLogType =
  | "keyword_generated"
  | "keyword_approved"
  | "keyword_rejected"
  | "seo_meta_generated"
  | "blog_generated"
  | "blog_approved"
  | "blog_rejected"
  | "blog_published"
  | "blog_deleted"
  | "package_generated"
  | "package_approved"
  | "package_rejected"
  | "package_published"
  | "package_deleted"
  | "analytics_generated"
  | "report_generated"
  | "voice_session"
  | "pricing_suggested"
  | "pricing_approved"
  | "pricing_rejected"
  | "review_submitted"
  | "review_approved"
  | "review_hidden"
  | "lead_scored"
  | "fraud_detected"
  | "fraud_resolved"
  | "user_blocked"
  | "user_unblocked"
  | "error";

export interface SeoKeyword {
  id: string;
  keyword: string;
  searchVolume: number;
  competition: "low" | "medium" | "high";
  trendScore: number;
  category: KeywordCategory;
  destination?: string;
  seoScore: number;
  status: KeywordStatus;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface SeoMetaRecord {
  id: string;
  keywordId: string;
  keyword: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  slug: string;
  faq: { question: string; answer: string }[];
  metaKeywords: string[];
  openGraph: {
    title: string;
    description: string;
    image?: string;
    url: string;
  };
  schemaMarkup: Record<string, unknown>;
  canonicalUrl: string;
  createdAt: string;
}

export interface BlogImagePrompt {
  id: string;
  label: string;
  prompt: string;
  url: string;
}

export interface AiBlogPost {
  id: string;
  title: string;
  slug: string;
  keyword: string;
  keywordId?: string;
  category: KeywordCategory;
  destination?: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  imagePrompts: BlogImagePrompt[];
  faq: { question: string; answer: string }[];
  wordCount: number;
  viewCount?: number;
  status: BlogStatus;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
}

export interface AiCenterLog {
  id: string;
  type: AiLogType;
  message: string;
  resourceId?: string;
  resourceType?:
    | "keyword"
    | "blog"
    | "seo_meta"
    | "settings"
    | "package"
    | "analytics"
    | "report"
    | "voice"
    | "pricing"
    | "review"
    | "lead"
    | "fraud"
    | "blocked_user";
  durationMs?: number;
  error?: string;
  createdAt: string;
}

export interface AiPackagePriceBreakdown {
  hotelCost: number;
  vehicleCost: number;
  activitiesCost: number;
  guideCost: number;
  mealsCost: number;
  margin: number;
  marginPercent: number;
  gst: number;
  gstPercent: number;
  subtotal: number;
  finalPrice: number;
}

export interface AiPackageHotelRef {
  mode: "existing" | "generated";
  hotelId?: string;
  name: string;
  city?: string;
  starRating?: number;
  pricePerNight?: number;
}

export interface AiPackageVehicleRef {
  mode: "existing" | "generated";
  vehicleId?: string;
  name: string;
  type?: string;
  seats?: number;
  pricePerDay?: number;
}

export interface AiPackageSeoMeta {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  slug: string;
  metaKeywords: string[];
  faq: { question: string; answer: string }[];
  canonicalUrl: string;
}

export interface AiTourPackage {
  id: string;
  destination: string;
  title: string;
  overview: string;
  shortDescription: string;
  duration: number;
  durationLabel: string;
  itinerary: {
    day: number;
    title: string;
    description: string;
    activities: string[];
    places: string[];
  }[];
  hotel: AiPackageHotelRef;
  vehicle: AiPackageVehicleRef;
  meals: string[];
  activities: string[];
  placesToVisit: string[];
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
  images: string[];
  imagePrompts: { label: string; prompt: string; url?: string }[];
  seoMeta: AiPackageSeoMeta;
  faq: { question: string; answer: string }[];
  priceBreakdown: AiPackagePriceBreakdown;
  price: number;
  category: KeywordCategory | string;
  slug: string;
  status: AiPackageStatus;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  publishedAt?: string;
  publishedPackageId?: string;
  rejectedReason?: string;
}

export interface AiAnalyticsInsight {
  id: string;
  category: "revenue" | "bookings" | "demand" | "operations" | "marketing";
  title: string;
  insight: string;
  impact: "high" | "medium" | "low";
  trend?: string;
}

export interface AiAnalyticsSnapshot {
  id: string;
  period: AiReportPeriod | "custom";
  dateFrom: string;
  dateTo: string;
  todayBookings: number;
  weeklyBookings: number;
  monthlyBookings: number;
  totalRevenue: number;
  pendingPayments: number;
  cancelledBookings: number;
  refundRequests: number;
  topDestinations: { name: string; count: number }[];
  topHotels: { name: string; count: number }[];
  topVehicles: { name: string; count: number }[];
  topPackages: { name: string; count: number }[];
  mostSearchedDestination: string;
  mostViewedHotel: string;
  mostViewedVehicle: string;
  averageBookingValue: number;
  returningCustomers: number;
  revenueByMonth: { month: string; revenue: number }[];
  bookingsByMonth: { month: string; bookings: number }[];
  destinationChart: { name: string; value: number }[];
  vehicleChart: { name: string; value: number }[];
  hotelChart: { name: string; value: number }[];
  insights: AiAnalyticsInsight[];
  summary: string;
  createdAt: string;
}

export interface AiReport {
  id: string;
  title: string;
  period: AiReportPeriod;
  dateFrom: string;
  dateTo: string;
  snapshotId: string;
  summary: string;
  csvData: string;
  pdfHtml: string;
  createdAt: string;
  createdBy?: string;
}

export interface AiPhase2Log {
  id: string;
  type: AiLogType;
  message: string;
  resourceId?: string;
  resourceType?: string;
  durationMs?: number;
  error?: string;
  createdAt: string;
}

export interface AiCenterSettings {
  id: "global";
  blogWordLimit: 1000 | 1500 | 2000 | 3000;
  keywordsPerDay: number;
  autoDraftEnabled: boolean;
  autoPublishEnabled: boolean;
  approvalRequired: boolean;
  packageAutoDraftEnabled: boolean;
  packageApprovalRequired: boolean;
  defaultPackageDuration: number;
  defaultMarginPercent: number;
  voiceDefaultLocale: "en" | "hi" | "auto";
  voiceGender: "male" | "female";
  voiceAutoDetectLanguage: boolean;
  analyticsAutoReport: boolean;
  dynamicPricingEnabled: boolean;
  reviewAgentEnabled: boolean;
  leadScoringEnabled: boolean;
  fraudDetectionEnabled: boolean;
  priceApprovalRequired: boolean;
  reviewApprovalRequired: boolean;
  manualPriceOverride: boolean;
  fraudRiskThreshold: number;
  leadHotThreshold: number;
  leadWarmThreshold: number;
  phase3NotificationsEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_AI_CENTER_SETTINGS: AiCenterSettings = {
  id: "global",
  blogWordLimit: 1500,
  keywordsPerDay: 10,
  autoDraftEnabled: false,
  autoPublishEnabled: false,
  approvalRequired: true,
  packageAutoDraftEnabled: false,
  packageApprovalRequired: true,
  defaultPackageDuration: 5,
  defaultMarginPercent: 18,
  voiceDefaultLocale: "auto",
  voiceGender: "female",
  voiceAutoDetectLanguage: true,
  analyticsAutoReport: false,
  dynamicPricingEnabled: true,
  reviewAgentEnabled: true,
  leadScoringEnabled: true,
  fraudDetectionEnabled: true,
  priceApprovalRequired: true,
  reviewApprovalRequired: true,
  manualPriceOverride: true,
  fraudRiskThreshold: 50,
  leadHotThreshold: 80,
  leadWarmThreshold: 50,
  phase3NotificationsEnabled: true,
  updatedAt: new Date().toISOString(),
};

export type PricingEntityType = "package" | "hotel" | "vehicle" | "activity";
export type PricingSuggestionStatus = "pending" | "approved" | "rejected";

export interface PriceRule {
  id: string;
  entityType: PricingEntityType;
  minPricePercent: number;
  maxPricePercent: number;
  minAbsolute?: number;
  maxAbsolute?: number;
  manualOverrideEnabled: boolean;
  enabled: boolean;
  updatedAt: string;
}

export interface PricingHistoryRecord {
  id: string;
  entityType: PricingEntityType;
  entityId: string;
  entityName: string;
  destination?: string;
  oldPrice: number;
  suggestedPrice: number;
  approvedPrice?: number;
  changePercent: number;
  reason: string;
  factors: {
    season: string;
    demandLevel: "low" | "medium" | "high";
    isWeekend: boolean;
    isPeakSeason: boolean;
    isFestival: boolean;
    bookingCount30d: number;
  };
  status: PricingSuggestionStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
}

export type AiRatingStatus = "pending" | "approved" | "hidden" | "rejected";

export interface AiRatingRecord {
  id: string;
  userId: string;
  userName: string;
  bookingId?: string;
  serviceType: string;
  serviceId: string;
  serviceName: string;
  destination?: string;
  hotelName?: string;
  vehicleName?: string;
  rating: number;
  review: string;
  photos: string[];
  suggestions?: string;
  complaints?: string;
  sentiment: "positive" | "negative" | "neutral";
  status: AiRatingStatus;
  adminReply?: string;
  aiSummary?: string;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface LeadScoreRecord {
  id: string;
  userId?: string;
  sessionId: string;
  email?: string;
  phone?: string;
  name?: string;
  score: number;
  status: "hot" | "warm" | "cold";
  signals: {
    destinationSearches: number;
    hotelViews: number;
    vehicleViews: number;
    repeatedVisits: number;
    timeOnSiteMinutes: number;
    bookingAttempts: number;
    lastDestination?: string;
  };
  aiSuggestion: string;
  createdAt: string;
  updatedAt: string;
}

export interface FraudLogRecord {
  id: string;
  userId?: string;
  email?: string;
  phone?: string;
  bookingId?: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  signals: { signal: string; severity: string; score: number }[];
  recommendedAction: string;
  actionTaken?: "warn" | "block" | "flag" | "hold" | "verify" | "none";
  status: "open" | "resolved" | "blocked";
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface BlockedUserRecord {
  id: string;
  userId?: string;
  email?: string;
  phone?: string;
  reason: string;
  fraudLogId?: string;
  permanent: boolean;
  blockedAt: string;
  blockedBy: string;
  unblockedAt?: string;
}

export interface Phase3Stats {
  pricingPending: number;
  pricingApproved: number;
  reviewsPending: number;
  reviewsApproved: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  fraudOpen: number;
  fraudHigh: number;
  blockedUsers: number;
}
