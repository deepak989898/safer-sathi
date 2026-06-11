import { CalendarCheck, Car, IndianRupee, Users } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { DestinationsChart } from "@/components/admin/charts/destinations-chart";
import { RevenueChart } from "@/components/admin/charts/revenue-chart";
import { MetricCard } from "@/components/admin/metric-card";
import { demoAnalytics } from "@/data/demo-data";
import { formatCurrency } from "@/lib/i18n";

export default function AdminDashboardPage() {
  const { totalBookings, totalRevenue, activeVehicles, totalCustomers } = demoAnalytics;

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Overview of your travel business performance"
        adminName="Rajesh Kumar"
      />
      <div className="space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Bookings"
            value={totalBookings.toLocaleString("en-IN")}
            change="+12.5% from last month"
            changeType="positive"
            icon={CalendarCheck}
          />
          <MetricCard
            title="Revenue"
            value={formatCurrency(totalRevenue)}
            change="+18.2% from last month"
            changeType="positive"
            icon={IndianRupee}
          />
          <MetricCard
            title="Active Vehicles"
            value={activeVehicles.toString()}
            change="4 added this week"
            changeType="neutral"
            icon={Car}
          />
          <MetricCard
            title="Total Customers"
            value={totalCustomers.toLocaleString("en-IN")}
            change="+8.1% from last month"
            changeType="positive"
            icon={Users}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart data={demoAnalytics.revenueByMonth} />
          <DestinationsChart data={demoAnalytics.topDestinations} />
        </div>
      </div>
    </>
  );
}
