import {
  demoAnalytics,
  demoBookings as initialDemoBookings,
  demoUsers,
} from "@/data/demo-data";
import type { Booking, User } from "@/types";

export {
  getBlogPostBySlug,
  getBlogPosts,
  getBusRoutes,
  getHotelBySlug,
  getHotels,
  getPackageById,
  getPackageBySlug,
  getPackages,
  getReviews,
  getVehicleById,
  getVehicles,
} from "@/lib/catalog-service";

let demoBookingsStore: Booking[] = [...initialDemoBookings];

async function getFirebaseAdmin() {
  return import("@/lib/firebase/admin");
}

export async function getBookings(userId?: string): Promise<Booking[]> {
  const { isAdminConfigured, getAdminDb } = await getFirebaseAdmin();

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
  const { isAdminConfigured, getAdminDb } = await getFirebaseAdmin();

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

  const { isAdminConfigured, getAdminDb } = await getFirebaseAdmin();

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

  const { isAdminConfigured, getAdminDb } = await getFirebaseAdmin();

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

export async function getUsers(): Promise<User[]> {
  return demoUsers;
}

export async function getAnalytics() {
  return demoAnalytics;
}

export function generateBookingNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `SS-${new Date().getFullYear()}-${num}`;
}
