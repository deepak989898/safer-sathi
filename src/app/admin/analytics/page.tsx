import { TrendingUp, Users, MousePointerClick, Percent } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { BookingsChart } from "@/components/admin/charts/bookings-chart";
import { RevenueChart } from "@/components/admin/charts/revenue-chart";
import { MetricCard } from "@/components/admin/metric-card";
import { demoAnalytics } from "@/data/demo-data";
import { formatCurrency } from "@/lib/i18n";

export default function AnalyticsPage() {
  const totalBookingsMonth = demoAnalytics.bookingsByMonth.reduce(
    (sum, m) => sum + m.bookings,
    0
  );
  const totalRevenueMonth = demoAnalytics.revenueByMonth.reduce(
    (sum, m) => sum + m.revenue,
    0
  );
  const avgBookingValue = Math.round(totalRevenueMonth / totalBookingsMonth);

  return (
    <>
      <AdminHeader
        title="Analytics"
        description="Business intelligence and performance metrics"
        adminName="Rajesh Kumar"
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Conversion Rate"
            value={`${demoAnalytics.conversionRate}%`}
            change="+0.4% vs last month"
            changeType="positive"
            icon={Percent}
          />
          <MetricCard
            title="Total Revenue (6mo)"
            value={formatCurrency(totalRevenueMonth)}
            change="Trending upward"
            changeType="positive"
            icon={TrendingUp}
          />
          <MetricCard
            title="Total Bookings (6mo)"
            value={totalBookingsMonth.toLocaleString("en-IN")}
            change="+15% vs prior period"
            changeType="positive"
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
          <RevenueChart data={demoAnalytics.revenueByMonth} title="Revenue Trend" />
          <BookingsChart data={demoAnalytics.bookingsByMonth} />
        </div>
      </div>
    </>
  );
}
