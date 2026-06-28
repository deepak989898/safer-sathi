import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { getBookings } from "@/lib/data-service";
import { getAdminHotels, hydrateHotelsStore } from "@/lib/hotel-store";
import { getAdminPackages, hydratePackagesStore } from "@/lib/package-store";
import { getAdminVehicles, hydrateVehiclesStore } from "@/lib/vehicle-store";
import { buildAdminDailyChecklist } from "@/lib/admin/daily-checklist";
import { computeBookingDashboardCounts } from "@/lib/bookings/admin-display";
import type { User, UserRole } from "@/types";

function mapAdminUser(id: string, data: Record<string, unknown>): User {
  return {
    id,
    email: String(data.email ?? ""),
    name: String(data.name ?? ""),
    phone: data.phone ? String(data.phone) : undefined,
    role: (data.role as UserRole) ?? "customer",
    status: (data.status as User["status"]) ?? "active",
    approved: Boolean(data.approved ?? true),
    avatar: data.avatar ? String(data.avatar) : undefined,
    locale: (data.locale as User["locale"]) ?? "en",
    segment: data.segment as User["segment"],
    totalBookings: Number(data.totalBookings ?? 0),
    totalSpent: Number(data.totalSpent ?? 0),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export async function listUsersForAdmin(): Promise<User[]> {
  if (isAdminEnvConfigured()) {
    try {
      const db = await getSafeAdminDb();
      if (db) {
        const snap = await db.collection("users").limit(500).get();
        return snap.docs.map((d) => mapAdminUser(d.id, d.data() as Record<string, unknown>));
      }
    } catch (error) {
      console.warn("Admin listUsers failed:", error);
    }
  }
  return [];
}

export async function getAdminAnalytics(actorRole: UserRole = "super_admin") {
  try {
    return await buildAdminAnalytics(actorRole);
  } catch (error) {
    console.error("getAdminAnalytics failed:", error);
    return emptyAdminAnalytics();
  }
}

function emptyAdminAnalytics() {
  return {
    totalBookings: 0,
    totalRevenue: 0,
    activeVehicles: 0,
    totalCustomers: 0,
    totalPackages: 0,
    totalHotels: 0,
    conversionRate: 0,
    revenueByMonth: Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleString("en-IN", { month: "short" }),
        revenue: 0,
      };
    }),
    bookingsByMonth: Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      return {
        month: date.toLocaleString("en-IN", { month: "short" }),
        bookings: 0,
      };
    }),
    topDestinations: [],
    recentBookings: [],
    dailyChecklist: {
      pendingBookings: 0,
      unconvertedAiChats: 0,
      pendingApprovals: 0,
      items: [],
    },
    bookingCounts: {
      pending: 0,
      upcoming: 0,
      completed: 0,
    },
  };
}

async function buildAdminAnalytics(actorRole: UserRole) {
  await Promise.all([
    hydratePackagesStore(),
    hydrateVehiclesStore(),
    hydrateHotelsStore(),
  ]);

  const [bookings, users, allPackages, vehicles, hotels] = await Promise.all([
    getBookings(),
    listUsersForAdmin(),
    Promise.resolve(getAdminPackages()),
    Promise.resolve(getAdminVehicles()),
    Promise.resolve(getAdminHotels()),
  ]);

  const totalRevenue = bookings
    .filter((b) => b.paymentStatus === "paid" || b.paymentStatus === "partial")
    .reduce((sum, b) => sum + b.amount, 0);

  const customers = users.filter((u) => u.role === "customer");
  const activeVehicles = vehicles.filter((v) => v.available).length;

  const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const key = date.toLocaleString("en-IN", { month: "short" });
    const monthBookings = bookings.filter((b) => {
      const d = new Date(b.createdAt);
      return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
    return {
      month: key,
      revenue: monthBookings
        .filter((b) => b.paymentStatus === "paid" || b.paymentStatus === "partial")
        .reduce((s, b) => s + b.amount, 0),
    };
  });

  const destinationCounts: Record<string, number> = {};
  for (const booking of bookings) {
    const name =
      typeof booking.serviceName === "object"
        ? booking.serviceName.en
        : String(booking.serviceName);
    destinationCounts[name] = (destinationCounts[name] ?? 0) + 1;
  }
  const topDestinations = Object.entries(destinationCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const bookingsByMonth = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const key = date.toLocaleString("en-IN", { month: "short" });
    const monthBookings = bookings.filter((b) => {
      const d = new Date(b.createdAt);
      return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
    return {
      month: key,
      bookings: monthBookings.length,
    };
  });

  const conversionRate =
    customers.length > 0
      ? Math.min(100, Math.round((bookings.length / customers.length) * 100))
      : 0;

  const dailyChecklist = await buildAdminDailyChecklist(actorRole, users).catch(
    () => ({
      pendingBookings: 0,
      unconvertedAiChats: 0,
      pendingApprovals: 0,
      items: [],
    })
  );

  const bookingCounts = computeBookingDashboardCounts(bookings);
  const { pending, upcoming, completed } = bookingCounts;

  return {
    totalBookings: bookings.length,
    totalRevenue,
    activeVehicles,
    totalCustomers: customers.length,
    totalPackages: allPackages.length,
    totalHotels: hotels.length,
    conversionRate,
    revenueByMonth,
    bookingsByMonth,
    topDestinations,
    recentBookings: bookings.slice(0, 10),
    dailyChecklist,
    bookingCounts: { pending, upcoming, completed },
  };
}
