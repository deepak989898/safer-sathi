import {
  demoAnalytics,
  demoBlogPosts,
  demoBookings as initialDemoBookings,
  demoBusRoutes,
  demoHotels,
  demoPackages,
  demoReviews,
  demoUsers,
  demoVehicles,
} from "@/data/demo-data";
import { isAdminConfigured, getAdminDb } from "@/lib/firebase/admin";
import type {
  Booking,
  BusRoute,
  Hotel,
  Review,
  SearchFilters,
  TourPackage,
  User,
  Vehicle,
} from "@/types";

let demoBookingsStore: Booking[] = [...initialDemoBookings];

export async function getVehicles(filters?: SearchFilters): Promise<Vehicle[]> {
  let results = [...demoVehicles];
  if (filters?.vehicleType) {
    results = results.filter((v) => v.type === filters.vehicleType);
  }
  if (filters?.minPrice) {
    results = results.filter((v) => v.pricePerDay >= filters.minPrice!);
  }
  if (filters?.maxPrice) {
    results = results.filter((v) => v.pricePerDay <= filters.maxPrice!);
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (v) =>
        v.name.en.toLowerCase().includes(q) ||
        v.name.hi.includes(q) ||
        v.location.toLowerCase().includes(q)
    );
  }
  return results;
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  return demoVehicles.find((v) => v.id === id) ?? null;
}

export async function getPackages(filters?: SearchFilters): Promise<TourPackage[]> {
  let results = [...demoPackages];
  if (filters?.packageCategory) {
    results = results.filter((p) => p.category === filters.packageCategory);
  }
  if (filters?.minPrice) {
    results = results.filter((p) => p.price >= filters.minPrice!);
  }
  if (filters?.maxPrice) {
    results = results.filter((p) => p.price <= filters.maxPrice!);
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    results = results.filter(
      (p) =>
        p.title.en.toLowerCase().includes(q) ||
        p.cities.some((c) => c.toLowerCase().includes(q))
    );
  }
  return results;
}

export async function getPackageBySlug(slug: string): Promise<TourPackage | null> {
  return demoPackages.find((p) => p.slug === slug) ?? null;
}

export async function getPackageById(id: string): Promise<TourPackage | null> {
  return demoPackages.find((p) => p.id === id) ?? null;
}

export async function getHotels(filters?: SearchFilters): Promise<Hotel[]> {
  let results = [...demoHotels];
  if (filters?.starRating) {
    results = results.filter((h) => h.starRating >= filters.starRating!);
  }
  if (filters?.minPrice) {
    results = results.filter((h) => h.priceFrom >= filters.minPrice!);
  }
  if (filters?.maxPrice) {
    results = results.filter((h) => h.priceFrom <= filters.maxPrice!);
  }
  if (filters?.location) {
    const loc = filters.location.toLowerCase();
    results = results.filter(
      (h) =>
        h.city.toLowerCase().includes(loc) ||
        h.location.toLowerCase().includes(loc)
    );
  }
  return results;
}

export async function getHotelBySlug(slug: string): Promise<Hotel | null> {
  return demoHotels.find((h) => h.slug === slug) ?? null;
}

export async function getBusRoutes(from?: string, to?: string): Promise<BusRoute[]> {
  let results = [...demoBusRoutes];
  if (from) results = results.filter((b) => b.from.toLowerCase().includes(from.toLowerCase()));
  if (to) results = results.filter((b) => b.to.toLowerCase().includes(to.toLowerCase()));
  return results;
}

export async function getBookings(userId?: string): Promise<Booking[]> {
  if (isAdminConfigured()) {
    try {
      const db = getAdminDb();
      let query = db.collection("bookings").orderBy("createdAt", "desc");
      if (userId) query = query.where("userId", "==", userId) as typeof query;
      const snapshot = await query.get();
      return snapshot.docs.map((doc) => doc.data() as Booking);
    } catch (error) {
      console.warn("Firebase getBookings failed, using demo data:", error);
    }
  }

  if (userId) return demoBookingsStore.filter((b) => b.userId === userId);
  return demoBookingsStore;
}

export async function getBookingById(id: string): Promise<Booking | null> {
  if (isAdminConfigured()) {
    try {
      const db = getAdminDb();
      const doc = await db.collection("bookings").doc(id).get();
      if (doc.exists) return doc.data() as Booking;
    } catch (error) {
      console.warn("Firebase getBookingById failed, using demo data:", error);
    }
  }

  return demoBookingsStore.find((b) => b.id === id) ?? null;
}

export async function createBooking(
  booking: Omit<Booking, "id"> & { id?: string }
): Promise<Booking> {
  const entry: Booking = {
    ...booking,
    id: booking.id ?? `bk_${Date.now()}`,
  };

  if (isAdminConfigured()) {
    try {
      const db = getAdminDb();
      await db.collection("bookings").doc(entry.id).set(entry);
      return entry;
    } catch (error) {
      console.warn("Firebase createBooking failed, using demo store:", error);
    }
  }

  demoBookingsStore.unshift(entry);
  return entry;
}

export async function updateBooking(
  id: string,
  updates: Partial<Booking>
): Promise<Booking | null> {
  const existing = await getBookingById(id);
  if (!existing) return null;

  const updated: Booking = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };

  if (isAdminConfigured()) {
    try {
      const db = getAdminDb();
      const { id: _id, ...updateFields } = updated;
      await db.collection("bookings").doc(id).update(updateFields);
      return updated;
    } catch (error) {
      console.warn("Firebase updateBooking failed, using demo store:", error);
    }
  }

  const index = demoBookingsStore.findIndex((b) => b.id === id);
  if (index >= 0) demoBookingsStore[index] = updated;
  return updated;
}

export function resetDemoBookings(): void {
  demoBookingsStore = [...initialDemoBookings];
}

export async function getReviews(): Promise<Review[]> {
  return demoReviews;
}

export async function getUsers(): Promise<User[]> {
  return demoUsers;
}

export async function getBlogPosts() {
  return demoBlogPosts;
}

export async function getBlogPostBySlug(slug: string) {
  return demoBlogPosts.find((p) => p.slug === slug) ?? null;
}

export async function getAnalytics() {
  return demoAnalytics;
}

export function generateBookingNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `SS-${new Date().getFullYear()}-${num}`;
}
