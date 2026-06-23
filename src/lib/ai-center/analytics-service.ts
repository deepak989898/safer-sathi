import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";
import { listUsersForAdmin } from "@/lib/analytics-service";
import { getBookings } from "@/lib/data-service";
import { hydrateHotelsStore } from "@/lib/hotel-store";
import { hydratePackagesStore } from "@/lib/package-store";
import { hydrateVehiclesStore } from "@/lib/vehicle-store";
import type {
  AiAnalyticsInsight,
  AiAnalyticsSnapshot,
  AiPhase2Log,
  AiReport,
  AiReportPeriod,
} from "@/lib/ai-center/types";
import type { Booking } from "@/types";

const COLLECTIONS = {
  analytics: "analytics",
  reports: "reports",
  logs: "ai_logs",
} as const;

let analyticsCache: AiAnalyticsSnapshot[] = [];
let reportsCache: AiReport[] = [];
let phase2LogCache: AiPhase2Log[] = [];

function sanitize<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

async function persist(collection: string, id: string, data: object): Promise<void> {
  if (!isAdminEnvConfigured()) return;
  try {
    const db = await getSafeAdminDb();
    if (!db) return;
    await db.collection(collection).doc(id).set(sanitize(data));
  } catch (error) {
    console.warn(`Firebase persist ${collection}/${id} failed:`, error);
  }
}

async function loadCollection<T extends { id: string; createdAt: string }>(
  collection: string,
  limit = 100
): Promise<T[]> {
  if (!isAdminEnvConfigured()) return [];
  try {
    const db = await getSafeAdminDb();
    if (!db) return [];
    const snap = await db.collection(collection).limit(limit).get();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as T)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

export async function hydrateAiAnalyticsStore(): Promise<void> {
  const [analytics, reports, logs] = await Promise.all([
    loadCollection<AiAnalyticsSnapshot>(COLLECTIONS.analytics),
    loadCollection<AiReport>(COLLECTIONS.reports),
    loadCollection<AiPhase2Log>(COLLECTIONS.logs),
  ]);
  analyticsCache = analytics;
  reportsCache = reports;
  phase2LogCache = logs;
}

function inRange(date: string, from: Date, to: Date): boolean {
  const d = new Date(date);
  return d >= from && d <= to;
}

function countBookings(bookings: Booking[], from: Date, to: Date): number {
  return bookings.filter((b) => inRange(b.createdAt, from, to)).length;
}

function sumRevenue(bookings: Booking[], from: Date, to: Date): number {
  return bookings
    .filter(
      (b) =>
        inRange(b.createdAt, from, to) &&
        (b.paymentStatus === "paid" || b.paymentStatus === "partial")
    )
    .reduce((s, b) => s + b.amount, 0);
}

function topFromBookings(
  bookings: Booking[],
  field: "serviceName" | "serviceType"
): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const b of bookings) {
    const name =
      field === "serviceName"
        ? typeof b.serviceName === "object"
          ? b.serviceName.en
          : String(b.serviceName)
        : b.serviceType;
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function buildInsights(
  bookings: Booking[],
  topDestinations: { name: string; count: number }[],
  topVehicles: { name: string; count: number }[]
): AiAnalyticsInsight[] {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const thisWeek = countBookings(bookings, weekAgo, now);
  const lastWeek = countBookings(bookings, twoWeeksAgo, weekAgo);
  const weekChange =
    lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : thisWeek > 0 ? 100 : 0;

  const topDest = topDestinations[0];
  const topVehicle = topVehicles[0];

  const insights: AiAnalyticsInsight[] = [
    {
      id: "ins_weekly_bookings",
      category: "bookings",
      title: "Weekly Booking Trend",
      insight:
        weekChange >= 0
          ? `Bookings increased by ${weekChange}% compared to last week.`
          : `Bookings decreased by ${Math.abs(weekChange)}% compared to last week.`,
      impact: "high",
      trend: weekChange >= 0 ? "up" : "down",
    },
  ];

  if (topDest) {
    insights.push({
      id: "ins_top_dest",
      category: "demand",
      title: `${topDest.name} Bookings`,
      insight: `${topDest.name} is your most booked service with ${topDest.count} booking${topDest.count === 1 ? "" : "s"}.`,
      impact: "high",
      trend: "up",
    });
  }

  if (topVehicle) {
    insights.push({
      id: "ins_vehicle",
      category: "operations",
      title: "Most Booked Vehicle",
      insight: `${topVehicle.name} is the most booked vehicle.`,
      impact: "medium",
      trend: "neutral",
    });
  }

  const pendingCount = bookings.filter(
    (b) => b.paymentStatus === "pending" || b.paymentStatus === "partial"
  ).length;
  if (pendingCount > 0) {
    insights.push({
      id: "ins_pending_payments",
      category: "operations",
      title: "Pending Payments",
      insight: `${pendingCount} booking${pendingCount === 1 ? "" : "s"} need payment follow-up.`,
      impact: pendingCount >= 5 ? "high" : "medium",
      trend: "neutral",
    });
  }

  return insights;
}

export async function buildAnalyticsSnapshot(
  dateFrom?: string,
  dateTo?: string
): Promise<AiAnalyticsSnapshot> {
  await Promise.all([
    hydratePackagesStore(),
    hydrateVehiclesStore(),
    hydrateHotelsStore(),
  ]);

  const now = new Date();
  const to = dateTo ? new Date(dateTo) : now;
  const from = dateFrom
    ? new Date(dateFrom)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [bookings, users] = await Promise.all([
    getBookings(),
    listUsersForAdmin(),
  ]);

  const filtered = bookings.filter((b) => inRange(b.createdAt, from, to));
  const customers = users.filter((u) => u.role === "customer");
  const returningCustomers = customers.filter((c) => (c.totalBookings ?? 0) > 1).length;

  const bookingSource = filtered.length > 0 ? filtered : bookings;
  const topDestinations = topFromBookings(bookingSource, "serviceName");
  const topVehicles = topFromBookings(
    bookingSource.filter((b) =>
      ["vehicle", "car_rental", "tempo_traveller", "bus", "airport_pickup"].includes(b.serviceType)
    ),
    "serviceName"
  );
  const topHotels = topFromBookings(
    bookingSource.filter((b) => b.serviceType === "hotel"),
    "serviceName"
  );
  const topPackages = topFromBookings(
    bookingSource.filter((b) => b.serviceType === "package" || b.serviceType === "holiday"),
    "serviceName"
  );

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

  const bookingsByMonth = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const key = date.toLocaleString("en-IN", { month: "short" });
    const monthBookings = bookings.filter((b) => {
      const d = new Date(b.createdAt);
      return d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();
    });
    return { month: key, bookings: monthBookings.length };
  });

  const totalRevenue = sumRevenue(filtered, from, to);
  const avgValue = filtered.length > 0 ? Math.round(totalRevenue / filtered.length) : 0;
  const insights = buildInsights(bookings, topDestinations, topVehicles);

  const snapshot: AiAnalyticsSnapshot = {
    id: `analytics_${Date.now()}`,
    period: "custom",
    dateFrom: from.toISOString(),
    dateTo: to.toISOString(),
    todayBookings: countBookings(bookings, todayStart, now),
    weeklyBookings: countBookings(bookings, weekStart, now),
    monthlyBookings: countBookings(bookings, monthStart, now),
    totalRevenue,
    pendingPayments: filtered.filter((b) => b.paymentStatus === "pending" || b.paymentStatus === "partial")
      .length,
    cancelledBookings: filtered.filter((b) => b.status === "cancelled").length,
    refundRequests: filtered.filter((b) => b.paymentStatus === "refunded").length,
    topDestinations,
    topHotels,
    topVehicles,
    topPackages,
    mostSearchedDestination: topDestinations[0]?.name ?? "—",
    mostViewedHotel: topHotels[0]?.name ?? "—",
    mostViewedVehicle: topVehicles[0]?.name ?? "—",
    averageBookingValue: avgValue,
    returningCustomers,
    revenueByMonth,
    bookingsByMonth,
    destinationChart: topDestinations.map((d) => ({ name: d.name, value: d.count })),
    vehicleChart: topVehicles.map((v) => ({ name: v.name, value: v.count })),
    hotelChart: topHotels.map((h) => ({ name: h.name, value: h.count })),
    insights,
    summary: insights
      .filter((i) => i.impact === "high")
      .map((i) => i.insight)
      .join(" "),
    createdAt: new Date().toISOString(),
  };

  analyticsCache = [snapshot, ...analyticsCache.filter((s) => s.id !== snapshot.id)].slice(
    0,
    50
  );
  await persist(COLLECTIONS.analytics, snapshot.id, snapshot);

  const log: AiPhase2Log = {
    id: `log_${Date.now()}`,
    type: "analytics_generated",
    message: `Analytics snapshot generated (${from.toDateString()} – ${to.toDateString()})`,
    resourceId: snapshot.id,
    resourceType: "analytics",
    createdAt: new Date().toISOString(),
  };
  phase2LogCache = [log, ...phase2LogCache].slice(0, 200);
  await persist(COLLECTIONS.logs, log.id, log);

  return snapshot;
}

function periodRange(period: AiReportPeriod): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (period === "daily") from.setDate(from.getDate() - 1);
  else if (period === "weekly") from.setDate(from.getDate() - 7);
  else from.setMonth(from.getMonth() - 1);
  return { from, to };
}

export async function generateAiReport(
  period: AiReportPeriod,
  createdBy?: string
): Promise<AiReport> {
  const { from, to } = periodRange(period);
  const snapshot = await buildAnalyticsSnapshot(from.toISOString(), to.toISOString());

  const csvRows = [
    ["Metric", "Value"],
    ["Today Bookings", snapshot.todayBookings],
    ["Weekly Bookings", snapshot.weeklyBookings],
    ["Monthly Bookings", snapshot.monthlyBookings],
    ["Total Revenue", snapshot.totalRevenue],
    ["Pending Payments", snapshot.pendingPayments],
    ["Cancelled", snapshot.cancelledBookings],
    ["Refunds", snapshot.refundRequests],
    ["Avg Booking Value", snapshot.averageBookingValue],
    ["Returning Customers", snapshot.returningCustomers],
    ...snapshot.topDestinations.map((d) => [`Top Destination: ${d.name}`, d.count]),
  ];
  const csvData = csvRows.map((r) => r.join(",")).join("\n");

  const pdfHtml = `<!DOCTYPE html><html><head><title>Safar Sathi ${period} Report</title>
<style>body{font-family:sans-serif;padding:24px}h1{color:#0d9488}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}</style>
</head><body>
<h1>Safar Sathi AI Analytics — ${period.charAt(0).toUpperCase() + period.slice(1)} Report</h1>
<p>${from.toDateString()} – ${to.toDateString()}</p>
<h2>Summary</h2><p>${snapshot.summary}</p>
<h2>Key Metrics</h2>
<table><tr><th>Metric</th><th>Value</th></tr>
<tr><td>Total Revenue</td><td>₹${snapshot.totalRevenue.toLocaleString("en-IN")}</td></tr>
<tr><td>Monthly Bookings</td><td>${snapshot.monthlyBookings}</td></tr>
<tr><td>Pending Payments</td><td>${snapshot.pendingPayments}</td></tr>
<tr><td>Avg Booking Value</td><td>₹${snapshot.averageBookingValue.toLocaleString("en-IN")}</td></tr>
</table>
<h2>AI Insights</h2><ul>${snapshot.insights.map((i) => `<li><strong>${i.title}</strong>: ${i.insight}</li>`).join("")}</ul>
</body></html>`;

  const report: AiReport = {
    id: `report_${Date.now()}`,
    title: `${period.charAt(0).toUpperCase() + period.slice(1)} Analytics Report`,
    period,
    dateFrom: from.toISOString(),
    dateTo: to.toISOString(),
    snapshotId: snapshot.id,
    summary: snapshot.summary,
    csvData,
    pdfHtml,
    createdAt: new Date().toISOString(),
    createdBy,
  };

  reportsCache = [report, ...reportsCache].slice(0, 50);
  await persist(COLLECTIONS.reports, report.id, report);

  const log: AiPhase2Log = {
    id: `log_${Date.now()}`,
    type: "report_generated",
    message: `Generated ${period} report`,
    resourceId: report.id,
    resourceType: "report",
    createdAt: new Date().toISOString(),
  };
  phase2LogCache = [log, ...phase2LogCache].slice(0, 200);
  await persist(COLLECTIONS.logs, log.id, log);

  return report;
}

export function listAnalyticsSnapshots(): AiAnalyticsSnapshot[] {
  return [...analyticsCache];
}

export function listAiReports(): AiReport[] {
  return [...reportsCache];
}

export function getAiReportById(id: string): AiReport | null {
  return reportsCache.find((r) => r.id === id) ?? null;
}

export function listPhase2Logs(limit = 100): AiPhase2Log[] {
  return phase2LogCache.slice(0, limit);
}
