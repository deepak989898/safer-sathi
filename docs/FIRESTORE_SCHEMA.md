# Firestore Database Schema - Safar Sathi

## Collections Overview

### users
```typescript
{
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: "super_admin" | "manager" | "sales_agent" | "support_agent" | "driver" | "customer";
  avatar?: string;
  locale: "en" | "hi";
  segment?: "vip" | "regular" | "new" | "at_risk";
  totalBookings?: number;
  totalSpent?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### vehicles
```typescript
{
  id: string;
  name: { en: string; hi: string };
  type: "car" | "suv" | "luxury" | "tempo_traveller" | "mini_bus" | "bus";
  seats: number;
  pricePerDay: number;
  pricePerKm?: number;
  images: string[];
  available: boolean;
  fuelType: string;
  driverIncluded: boolean;
  description: { en: string; hi: string };
  features: string[];
  rating: number;
  reviewCount: number;
  location: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### packages
```typescript
{
  id: string;
  title: { en: string; hi: string };
  slug: string;
  category: "domestic" | "international" | "religious" | "adventure" | "family" | "honeymoon";
  duration: number;
  durationLabel: { en: string; hi: string };
  cities: string[];
  hotels: string[];
  meals: string[];
  activities: string[];
  price: number;
  originalPrice?: number;
  images: string[];
  description: { en: string; hi: string };
  itinerary: Array<{ day: number; title: LocalizedString; description: LocalizedString; activities: string[] }>;
  inclusions: LocalizedString[];
  exclusions: LocalizedString[];
  rating: number;
  reviewCount: number;
  featured: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### hotels
```typescript
{
  id: string;
  name: { en: string; hi: string };
  slug: string;
  starRating: number;
  location: string;
  city: string;
  images: string[];
  amenities: string[];
  description: { en: string; hi: string };
  priceFrom: number;
  rating: number;
  reviewCount: number;
  available: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### rooms (subcollection of hotels or standalone)
```typescript
{
  id: string;
  hotelId: string;
  name: { en: string; hi: string };
  type: string;
  pricePerNight: number;
  maxGuests: number;
  available: boolean;
  amenities: string[];
  images: string[];
}
```

### bookings
```typescript
{
  id: string;
  bookingNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: "package" | "vehicle" | "hotel" | "bus" | "car_rental" | "tempo_traveller" | "airport_pickup" | "holiday";
  serviceId: string;
  serviceName: { en: string; hi: string };
  startDate: string;
  endDate?: string;
  guests: number;
  amount: number;
  depositAmount?: number;
  paidAmount: number;
  status: "pending" | "confirmed" | "upcoming" | "completed" | "cancelled" | "refunded";
  paymentStatus: "pending" | "partial" | "paid" | "failed" | "refunded";
  aiProcessed: boolean;
  fraudFlagged?: boolean;
  fraudScore?: number;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### payments
```typescript
{
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: "INR";
  method: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  status: "pending" | "partial" | "paid" | "failed" | "refunded";
  isDeposit: boolean;
  createdAt: Timestamp;
}
```

### supportTickets
```typescript
{
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  aiHandled: boolean;
  confidence?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### notifications
```typescript
{
  id: string;
  userId: string;
  type: "email" | "whatsapp" | "sms" | "push";
  title: string;
  message: string;
  sent: boolean;
  createdAt: Timestamp;
}
```

### reviews
```typescript
{
  id: string;
  userId: string;
  userName: string;
  serviceType: string;
  serviceId: string;
  rating: number;
  comment: { en: string; hi: string };
  createdAt: Timestamp;
}
```

### blogs
```typescript
{
  id: string;
  slug: string;
  title: { en: string; hi: string };
  excerpt: { en: string; hi: string };
  content: { en: string; hi: string };
  image: string;
  author: string;
  tags: string[];
  published: boolean;
  seoTitle?: { en: string; hi: string };
  seoDescription?: { en: string; hi: string };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### analytics
```typescript
{
  id: string; // e.g. "daily", "monthly"
  totalBookings: number;
  totalRevenue: number;
  activeVehicles: number;
  totalCustomers: number;
  conversionRate: number;
  topDestinations: Array<{ name: string; count: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  bookingsByMonth: Array<{ month: string; bookings: number }>;
  computedAt: Timestamp;
}
```

### auditLogs
```typescript
{
  id: string;
  action: string;
  actorId: string;
  actorRole: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}
```

### aiTasks
```typescript
{
  id: string;
  agentType: "travel" | "booking" | "support" | "sales" | "marketing" | "seo" | "social" | "analytics" | "fraud";
  status: "pending" | "running" | "completed" | "failed";
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  createdAt: Timestamp;
  completedAt?: Timestamp;
}
```

### workflows
```typescript
{
  id: string;
  name: string;
  trigger: string;
  bookingId?: string;
  steps: Array<{ id: string; action: string; status: "pending" | "completed" | "failed"; completedAt?: Timestamp }>;
  status: "active" | "paused";
  createdAt: Timestamp;
}
```

### drivers
```typescript
{
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleIds: string[];
  available: boolean;
  rating: number;
  createdAt: Timestamp;
}
```

## Indexes

See `firebase/firestore.indexes.json` for composite indexes required for queries.

## Security

See `firebase/firestore.rules` for RBAC-based access control.
