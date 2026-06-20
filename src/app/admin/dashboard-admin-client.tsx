"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, IndianRupee, Users } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { DailyAdminChecklist } from "@/components/admin/daily-admin-checklist";
import { DestinationsChart } from "@/components/admin/charts/destinations-chart";
import { RevenueChart } from "@/components/admin/charts/revenue-chart";
import { MetricCard } from "@/components/admin/metric-card";
import { useAuth } from "@/contexts/auth-context";
import type { AdminDailyChecklist } from "@/lib/admin/daily-checklist";
import { formatCurrency } from "@/lib/i18n";
import { toast } from "sonner";

interface AnalyticsData {
  totalBookings: number;
  totalRevenue: number;
  totalCustomers: number;
  revenueByMonth: { month: string; revenue: number }[];
  topDestinations: { name: string; count: number }[];
  dailyChecklist?: AdminDailyChecklist;
}

export default function DashboardAdminClient() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const role = user?.role ?? "super_admin";
      const res = await fetch(`/api/admin/analytics?actorRole=${encodeURIComponent(role)}`);
      const json = await res.json();
      if (json.success) setData(json.data);
      else toast.error(json.error ?? "Failed to load dashboard");
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

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
    totalCustomers: 0,
    revenueByMonth: [],
    topDestinations: [],
    dailyChecklist: {
      pendingBookings: 0,
      unconvertedAiChats: 0,
      pendingApprovals: 0,
      items: [],
    },
  };

  const checklist = analytics.dailyChecklist ?? {
    pendingBookings: 0,
    unconvertedAiChats: 0,
    pendingApprovals: 0,
    items: [],
  };

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Overview of your travel business performance"
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-6 p-6">
        <DailyAdminChecklist checklist={checklist} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
            title="Total Customers"
            value={analytics.totalCustomers.toLocaleString("en-IN")}
            change="Registered users"
            changeType="neutral"
            icon={Users}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart data={analytics.revenueByMonth} />
          {analytics.topDestinations.length > 0 ? (
            <DestinationsChart data={analytics.topDestinations} />
          ) : (
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-dashed p-8 text-sm text-muted-foreground">
              No destination data yet — publish tour packages to see top destinations.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
