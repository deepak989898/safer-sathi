import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { sanitizeForFirestore } from "@/lib/catalog/persistence";
import type { Booking, User } from "@/types";

export {
  getAllBlogSlugs,
  getBlogCategoriesList,
  getBlogPostBySlug,
  getBlogPosts,
  getBusRoutes,
  getHotelBySlug,
  getHotels,
  getPackageById,
  getPackageBySlug,
  getPackages,
  getRelatedBlogPostsForSlug,
  getReviews,
  getVehicleById,
  getVehicles,
} from "@/lib/catalog-service";

async function getAdminDb() {
  if (!isAdminEnvConfigured()) return null;
  return getSafeAdminDb();
}

export async function getBookings(userId?: string): Promise<Booking[]> {
  const db = await getAdminDb();
  if (!db) return [];

  try {
    let query = db.collection("bookings").orderBy("createdAt", "desc").limit(500);
    if (userId) {
      query = db
        .collection("bookings")
        .where("userId", "==", userId)
        .limit(500) as typeof query;
    }
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as Booking);
  } catch (error) {
    console.warn("Firebase getBookings failed:", error);
    try {
      const db2 = await getAdminDb();
      if (!db2) return [];
      const snap = await db2.collection("bookings").limit(500).get();
      const all = snap.docs.map((doc) => doc.data() as Booking);
      return userId ? all.filter((b) => b.userId === userId) : all;
    } catch {
      return [];
    }
  }
}

export async function getCustomerBookings(
  userId: string,
  email: string
): Promise<Booking[]> {
  const normalizedEmail = email.toLowerCase().trim();
  const all = await getBookings();
  const map = new Map<string, Booking>();

  for (const booking of all) {
    const matchesUser = booking.userId === userId;
    const matchesEmail =
      booking.customerEmail.toLowerCase().trim() === normalizedEmail;
    if (matchesUser || matchesEmail) {
      map.set(booking.id, booking);
    }
  }

  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBookingById(id: string): Promise<Booking | null> {
  const db = await getAdminDb();
  if (!db) return null;

  try {
    const doc = await db.collection("bookings").doc(id).get();
    if (doc.exists) return doc.data() as Booking;
  } catch (error) {
    console.warn("Firebase getBookingById failed:", error);
  }
  return null;
}

export async function getBookingByNumber(bookingNumber: string): Promise<Booking | null> {
  const db = await getAdminDb();
  if (!db) return null;

  const normalized = bookingNumber.trim().toUpperCase();
  try {
    const snap = await db
      .collection("bookings")
      .where("bookingNumber", "==", normalized)
      .limit(1)
      .get();
    if (!snap.empty) return snap.docs[0].data() as Booking;
  } catch (error) {
    console.warn("Firebase getBookingByNumber query failed:", error);
    try {
      const snap = await db.collection("bookings").limit(500).get();
      const match = snap.docs
        .map((doc) => doc.data() as Booking)
        .find((booking) => booking.bookingNumber?.toUpperCase() === normalized);
      if (match) return match;
    } catch (fallbackError) {
      console.warn("Firebase getBookingByNumber fallback failed:", fallbackError);
    }
  }
  return null;
}

async function persistBookingRecord(booking: Booking): Promise<boolean> {
  const db = await getAdminDb();
  if (!db) return false;

  try {
    const payload = sanitizeForFirestore(booking);
    await db.collection("bookings").doc(booking.id).set(payload, { merge: true });
    return true;
  } catch (error) {
    console.error("Firebase persistBookingRecord failed:", error, booking.id);
    return false;
  }
}

export async function upsertBooking(booking: Booking): Promise<Booking | null> {
  const entry: Booking = sanitizeForFirestore({
    ...booking,
    bookingNumber: booking.bookingNumber.trim().toUpperCase(),
    customerEmail: booking.customerEmail.toLowerCase().trim(),
    updatedAt: new Date().toISOString(),
  });
  const ok = await persistBookingRecord(entry);
  return ok ? entry : null;
}

export async function createBooking(
  booking: Omit<Booking, "id"> & { id?: string }
): Promise<Booking> {
  const entry: Booking = sanitizeForFirestore({
    ...booking,
    id: booking.id ?? `bk_${Date.now()}`,
    bookingNumber: booking.bookingNumber.trim().toUpperCase(),
    customerEmail: booking.customerEmail.toLowerCase().trim(),
  });

  await persistBookingRecord(entry);
  return entry;
}

export async function updateBooking(
  id: string,
  updates: Partial<Booking>
): Promise<Booking | null> {
  const existing = await getBookingById(id);
  if (!existing) return null;

  const updated: Booking = sanitizeForFirestore({
    ...existing,
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  });

  const ok = await persistBookingRecord(updated);
  return ok ? updated : null;
}

export async function getUsers(): Promise<User[]> {
  if (!isAdminEnvConfigured()) return [];

  try {
    const db = await getSafeAdminDb();
    if (!db) return [];
    const snap = await db.collection("users").limit(500).get();
    return snap.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      return {
        id: doc.id,
        email: String(data.email ?? ""),
        name: String(data.name ?? ""),
        role: (data.role as User["role"]) ?? "customer",
        status: (data.status as User["status"]) ?? "active",
        approved: Boolean(data.approved ?? true),
        locale: (data.locale as User["locale"]) ?? "en",
        createdAt: String(data.createdAt ?? new Date().toISOString()),
        updatedAt: String(data.updatedAt ?? new Date().toISOString()),
      };
    });
  } catch (error) {
    console.warn("Firebase getUsers failed:", error);
    return [];
  }
}

export function generateBookingNumber(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `SS-${new Date().getFullYear()}-${num}`;
}
