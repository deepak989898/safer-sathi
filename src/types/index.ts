export type UserRole =
  | "super_admin"
  | "manager"
  | "sales_agent"
  | "support_agent"
  | "driver"
  | "customer";

export type Locale = "en" | "hi";

export type VehicleType =
  | "car"
  | "suv"
  | "luxury"
  | "tempo_traveller"
  | "mini_bus"
  | "bus";

export type PackageCategory =
  | "domestic"
  | "international"
  | "religious"
  | "adventure"
  | "family"
  | "honeymoon";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "upcoming"
  | "completed"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "partial" | "paid" | "failed" | "refunded";

export type ServiceType =
  | "package"
  | "vehicle"
  | "hotel"
  | "bus"
  | "car_rental"
  | "tempo_traveller"
  | "airport_pickup"
  | "holiday";

export type AIAgentType =
  | "travel"
  | "booking"
  | "support"
  | "sales"
  | "marketing"
  | "seo"
  | "social"
  | "analytics"
  | "fraud"
  | "market_packages";

export type AIAgentStatus = "active" | "paused" | "error";

export type PackagePublishStatus =
  | "draft"
  | "manager_review"
  | "pending_approval"
  | "published"
  | "rejected";

export interface LocalizedString {
  en: string;
  hi: string;
}

export type UserStatus = "active" | "pending" | "suspended";

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  approved: boolean;
  avatar?: string;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
  aiPreferences?: import("@/types/travel-manager").AITravelPreferences;
  segment?: "vip" | "regular" | "new" | "at_risk";
  totalBookings?: number;
  totalSpent?: number;
}

export type VehicleStatus = "active" | "inactive" | "maintenance";

export interface Vehicle {
  id: string;
  slug?: string;
  name: LocalizedString;
  brand?: string;
  category?: string;
  type: VehicleType;
  seats: number;
  pricePerDay: number;
  pricePerKm?: number;
  images: string[];
  available: boolean;
  status?: VehicleStatus;
  fuelType: string;
  driverIncluded: boolean;
  description: LocalizedString;
  features: string[];
  rating: number;
  reviewCount: number;
  location: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackageItineraryDay {
  day: number;
  title: LocalizedString;
  description: LocalizedString;
  activities: string[];
}

export interface TourPackage {
  id: string;
  title: LocalizedString;
  slug: string;
  category: PackageCategory;
  duration: number;
  durationLabel: LocalizedString;
  cities: string[];
  hotels: string[];
  meals: string[];
  activities: string[];
  price: number;
  originalPrice?: number;
  images: string[];
  description: LocalizedString;
  itinerary: PackageItineraryDay[];
  inclusions: LocalizedString[];
  exclusions: LocalizedString[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  transport?: LocalizedString;
  publishStatus?: PackagePublishStatus;
  marketAnalysis?: LocalizedString;
  proposedBy?: "ai_market_agent" | "admin" | "manager";
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HotelRoom {
  id: string;
  name: LocalizedString;
  type: string;
  pricePerNight: number;
  maxGuests: number;
  available: boolean;
  amenities: string[];
  images: string[];
}

export type HotelStatus = "active" | "inactive";

export interface Hotel {
  id: string;
  name: LocalizedString;
  slug: string;
  starRating: number;
  location: string;
  address?: string;
  city: string;
  state?: string;
  country?: string;
  images: string[];
  amenities: string[];
  description: LocalizedString;
  priceFrom: number;
  rooms: HotelRoom[];
  rating: number;
  reviewCount: number;
  featured?: boolean;
  status?: HotelStatus;
  available: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  name: LocalizedString;
  destination: string;
  category: string;
  price: number;
  durationHours?: number;
  available: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BusRoute {
  id: string;
  operator: string;
  busType: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  price: number;
  seatsAvailable: number;
  totalSeats: number;
  amenities: string[];
}

export interface Booking {
  id: string;
  bookingNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: ServiceType;
  serviceId: string;
  serviceName: LocalizedString;
  startDate: string;
  endDate?: string;
  guests: number;
  amount: number;
  bookingMode?: "day" | "km";
  distanceKm?: number;
  depositAmount?: number;
  paidAmount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  aiProcessed: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  method: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: PaymentStatus;
  isDeposit: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  aiHandled: boolean;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  serviceType: ServiceType;
  serviceId: string;
  rating: number;
  comment: LocalizedString;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: LocalizedString;
  excerpt: LocalizedString;
  content: LocalizedString;
  image: string;
  author: string;
  tags: string[];
  published: boolean;
  seoTitle?: LocalizedString;
  seoDescription?: LocalizedString;
  createdAt: string;
  updatedAt: string;
}

export interface AIAgent {
  id: AIAgentType;
  name: LocalizedString;
  description: LocalizedString;
  status: AIAgentStatus;
  successRate: number;
  tasksHandled: number;
  lastRun?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  actorRole: UserRole;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AITask {
  id: string;
  agentType: AIAgentType;
  status: "pending" | "running" | "completed" | "failed";
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
}

export interface WorkflowStep {
  id: string;
  action: string;
  status: "pending" | "completed" | "failed";
  completedAt?: string;
}

export interface Workflow {
  id: string;
  name: string;
  trigger: string;
  steps: WorkflowStep[];
  status: "active" | "paused";
  createdAt: string;
}

export interface AnalyticsSnapshot {
  totalBookings: number;
  totalRevenue: number;
  activeVehicles: number;
  totalCustomers: number;
  conversionRate: number;
  topDestinations: { name: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
  bookingsByMonth: { month: string; bookings: number }[];
}

export interface Notification {
  id: string;
  userId: string;
  type: "email" | "whatsapp" | "sms" | "push";
  title: string;
  message: string;
  sent: boolean;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleIds: string[];
  available: boolean;
  rating: number;
  createdAt: string;
}

export interface SearchFilters {
  query?: string;
  location?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  minPrice?: number;
  maxPrice?: number;
  vehicleType?: VehicleType;
  packageCategory?: PackageCategory;
  starRating?: number;
  searchTab?: "packages" | "hotels" | "vehicles" | "flights";
  distanceKm?: number;
  vehicleBookingMode?: "day" | "km";
  fromCity?: string;
  toCity?: string;
  rooms?: number;
  travelers?: number;
  durationDays?: number;
  flightClass?: "economy" | "premium" | "business";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  packages?: TourPackage[];
  vehicles?: Vehicle[];
  hotels?: Hotel[];
  timestamp: string;
}
