"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingUp, Users, MousePointerClick, Percent } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { BookingsChart } from "@/components/admin/charts/bookings-chart";
import { RevenueChart } from "@/components/admin/charts/revenue-chart";
import { MetricCard } from "@/components/admin/metric-card";
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency } from "@/lib/i18n";
import { toast } from "sonner";

interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  totalCustomers: number;
  conversionRate: number;
  revenueByMonth: { month: string; revenue: number }[];
  bookingsByMonth: { month: string; bookings: number }[];
}

export default function AnalyticsAdminClient() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (json.success) setData(json.data);
      else toast.error(json.error ?? "Failed to load analytics");
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <>
        <AdminHeader
          title="Analytics"
          description="Business intelligence and performance metrics"
          adminName={user?.name ?? "Admin"}
        />
        <div className="p-6 text-sm text-muted-foreground">Loading analytics...</div>
      </>
    );
  }

  const analytics = data ?? {
    totalBookings: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    conversionRate: 0,
    revenueByMonth: [],
    bookingsByMonth: [],
  };

  const totalBookingsMonth = analytics.bookingsByMonth.reduce((sum, m) => sum + m.bookings, 0);
  const totalRevenueMonth = analytics.revenueByMonth.reduce((sum, m) => sum + m.revenue, 0);
  const avgBookingValue =
    totalBookingsMonth > 0 ? Math.round(totalRevenueMonth / totalBookingsMonth) : 0;

  return (
    <>
      <AdminHeader
        title="Analytics"
        description="Business intelligence and performance metrics"
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Conversion Rate"
            value={`${analytics.conversionRate}%`}
            change="Bookings per customer"
            changeType="neutral"
            icon={Percent}
          />
          <MetricCard
            title="Total Revenue (6mo)"
            value={formatCurrency(totalRevenueMonth)}
            change="From real bookings"
            changeType="neutral"
            icon={TrendingUp}
          />
          <MetricCard
            title="Total Bookings (6mo)"
            value={totalBookingsMonth.toLocaleString("en-IN")}
            change="Last 6 months"
            changeType="neutral"
            icon={MousePointerClick}
          />
          <MetricCard
            title="Avg. Booking Value"
            value={formatCurrency(avgBookingValue)}
            change="Per transaction"
            changeType="neutral"
            icon={Users}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart data={analytics.revenueByMonth} title="Revenue Trend" />
          <BookingsChart data={analytics.bookingsByMonth} />
        </div>
      </div>
    </>
  );
}
