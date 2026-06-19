"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, Car, IndianRupee, Users } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { DestinationsChart } from "@/components/admin/charts/destinations-chart";
import { RevenueChart } from "@/components/admin/charts/revenue-chart";
import { MetricCard } from "@/components/admin/metric-card";
import { useAuth } from "@/contexts/auth-context";
import { formatCurrency } from "@/lib/i18n";
import { toast } from "sonner";

interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  activeVehicles: number;
  totalCustomers: number;
  revenueByMonth: { month: string; revenue: number }[];
  topDestinations: { name: string; count: number }[];
}

export default function DashboardAdminClient() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (json.success) setData(json.data);
      else toast.error(json.error ?? "Failed to load dashboard");
    } catch {
      toast.error("Failed to load dashboard");
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
          title="Dashboard"
          description="Overview of your travel business performance"
          adminName={user?.name ?? "Admin"}
        />
        <div className="p-6 text-sm text-muted-foreground">Loading dashboard...</div>
      </>
    );
  }

  const analytics = data ?? {
    totalBookings: 0,
    totalRevenue: 0,
    activeVehicles: 0,
    totalCustomers: 0,
    revenueByMonth: [],
    topDestinations: [],
  };

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Overview of your travel business performance"
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Bookings"
            value={analytics.totalBookings.toLocaleString("en-IN")}
            change="Live from Firebase"
            changeType="neutral"
            icon={CalendarCheck}
          />
          <MetricCard
            title="Revenue"
            value={formatCurrency(analytics.totalRevenue)}
            change="Paid & partial bookings"
            changeType="neutral"
            icon={IndianRupee}
          />
          <MetricCard
            title="Active Vehicles"
            value={analytics.activeVehicles.toString()}
            change="Available in catalog"
            changeType="neutral"
            icon={Car}
          />
          <MetricCard
            title="Total Customers"
            value={analytics.totalCustomers.toLocaleString("en-IN")}
            change="Registered users"
            changeType="neutral"
            icon={Users}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart data={analytics.revenueByMonth} />
          <DestinationsChart data={analytics.topDestinations} />
        </div>
      </div>
    </>
  );
}
