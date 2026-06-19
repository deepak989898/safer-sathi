import { listAllUsers } from "@/lib/auth/auth-service";
import { getBookings } from "@/lib/data-service";
import { getAdminHotels, hydrateHotelsStore } from "@/lib/hotel-store";
import { getPublishedPackages, hydratePackagesStore } from "@/lib/package-store";
import { getAdminVehicles, hydrateVehiclesStore } from "@/lib/vehicle-store";

export async function getAdminAnalytics() {
  await Promise.all([
    hydratePackagesStore(),
    hydrateVehiclesStore(),
    hydrateHotelsStore(),
  ]);

  const [bookings, users, packages, vehicles, hotels] = await Promise.all([
    getBookings(),
    listAllUsers(),
    Promise.resolve(getPublishedPackages()),
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
      revenue: monthBookings.reduce((s, b) => s + b.amount, 0),
    };
  });

  const destinationCounts: Record<string, number> = {};
  for (const pkg of packages) {
    for (const city of pkg.cities) {
      destinationCounts[city] = (destinationCounts[city] ?? 0) + 1;
    }
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

  return {
    totalBookings: bookings.length,
    totalRevenue,
    activeVehicles,
    totalCustomers: customers.length,
    totalPackages: packages.length,
    totalHotels: hotels.length,
    conversionRate,
    revenueByMonth,
    bookingsByMonth,
    topDestinations,
    recentBookings: bookings.slice(0, 10),
  };
}
