"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarCheck,
  IndianRupee,
  MousePointerClick,
  Package,
  Percent,
  TrendingUp,
  Users,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { BookingsChart } from "@/components/admin/charts/bookings-chart";
import { DestinationsChart } from "@/components/admin/charts/destinations-chart";
import { RevenueChart } from "@/components/admin/charts/revenue-chart";
import { MetricCard } from "@/components/admin/metric-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { adminApiFetch, parseApiJson } from "@/lib/admin/api-client";
import { formatCurrency } from "@/lib/i18n";
import { toast } from "sonner";

interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  totalCustomers: number;
  totalPackages: number;
  totalHotels: number;
  activeVehicles: number;
  conversionRate: number;
  revenueByMonth: { month: string; revenue: number }[];
  bookingsByMonth: { month: string; bookings: number }[];
  topDestinations: { name: string; count: number }[];
}

export default function AnalyticsAdminClient() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiFetch("/api/admin/analytics");
      const json = await parseApiJson<{
        success?: boolean;
        data?: AnalyticsData;
        error?: string;
      }>(res);
      if (!json.success || !json.data) {
        throw new Error(json.error ?? `Failed to load analytics (${res.status})`);
      }
      setData(json.data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load analytics";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    void load();
  }, [authLoading, load, user]);

  if (authLoading || loading) {
    return (
      <>
        <AdminHeader
          title="Analytics"
          description="Live business metrics from Firebase bookings"
          adminName={user?.name ?? "Admin"}
        />
        <div className="p-6 text-sm text-muted-foreground">Loading analytics...</div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <AdminHeader
          title="Analytics"
          description="Live business metrics from Firebase bookings"
          adminName={user?.name ?? "Admin"}
        />
        <div className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-destructive">{error ?? "No analytics data"}</p>
          <Button variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      </>
    );
  }

  const totalBookingsMonth = data.bookingsByMonth.reduce((sum, m) => sum + m.bookings, 0);
  const totalRevenueMonth = data.revenueByMonth.reduce((sum, m) => sum + m.revenue, 0);
  const avgBookingValue =
    totalBookingsMonth > 0 ? Math.round(totalRevenueMonth / totalBookingsMonth) : 0;

  return (
    <>
      <AdminHeader
        title="Analytics"
        description="Live business metrics from Firebase bookings"
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Bookings"
            value={data.totalBookings.toLocaleString("en-IN")}
            change="All time"
            changeType="neutral"
            icon={CalendarCheck}
          />
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(data.totalRevenue)}
            change="Paid & partial"
            changeType="neutral"
            icon={IndianRupee}
          />
          <MetricCard
            title="Customers"
            value={data.totalCustomers.toLocaleString("en-IN")}
            change="Registered"
            changeType="neutral"
            icon={Users}
          />
          <MetricCard
            title="Conversion Rate"
            value={`${data.conversionRate}%`}
            change="Bookings per customer"
            changeType="neutral"
            icon={Percent}
          />
          <MetricCard
            title="Bookings (6 mo)"
            value={totalBookingsMonth.toLocaleString("en-IN")}
            change="Last 6 months"
            changeType="neutral"
            icon={MousePointerClick}
          />
          <MetricCard
            title="Revenue (6 mo)"
            value={formatCurrency(totalRevenueMonth)}
            change="Last 6 months"
            changeType="neutral"
            icon={TrendingUp}
          />
          <MetricCard
            title="Avg. Booking Value"
            value={formatCurrency(avgBookingValue)}
            change="Last 6 months"
            changeType="neutral"
            icon={IndianRupee}
          />
          <MetricCard
            title="Catalog"
            value={`${data.totalPackages} pkg · ${data.totalHotels} hotels`}
            change={`${data.activeVehicles} active vehicles`}
            changeType="neutral"
            icon={Package}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart data={data.revenueByMonth} title="Revenue Trend" />
          <BookingsChart data={data.bookingsByMonth} title="Bookings Trend" />
        </div>

        {data.topDestinations.length > 0 ? (
          <DestinationsChart data={data.topDestinations} />
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
            No booking data yet — top services will appear here after your first bookings.
          </div>
        )}
      </div>
    </>
  );
}
