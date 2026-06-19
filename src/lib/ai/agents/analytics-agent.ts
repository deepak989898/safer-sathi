import { getAdminAnalytics } from "@/lib/analytics-service";
import { routeCompletion, type AIProvider } from "../router";
import type { ChatMessage } from "../openai";

const SYSTEM_PROMPT = `You are Safar Sathi AI Analytics Agent. Analyze travel business metrics and
provide actionable insights on revenue, bookings, demand trends, and recommendations.`;

export interface AnalyticsInsight {
  category: "revenue" | "bookings" | "demand" | "operations" | "marketing";
  title: string;
  insight: string;
  impact: "high" | "medium" | "low";
  recommendation: string;
}

export interface AnalyticsAgentResult {
  snapshot: Awaited<ReturnType<typeof getAdminAnalytics>>;
  insights: AnalyticsInsight[];
  summary: string;
  provider: AIProvider;
}

function ruleBasedInsights(
  snapshot: Awaited<ReturnType<typeof getAdminAnalytics>>
): AnalyticsInsight[] {
  const topDest = snapshot.topDestinations[0];
  const latestRevenue = snapshot.revenueByMonth[snapshot.revenueByMonth.length - 1];
  const prevRevenue = snapshot.revenueByMonth[snapshot.revenueByMonth.length - 2] ?? latestRevenue;
  const revenueChange =
    prevRevenue.revenue > 0
      ? ((latestRevenue.revenue - prevRevenue.revenue) / prevRevenue.revenue) * 100
      : 0;

  const pendingBookings = snapshot.recentBookings.filter(
    (b) => b.paymentStatus === "partial"
  ).length;

  return [
    {
      category: "revenue",
      title: "Monthly Revenue Trend",
      insight: `Latest month revenue ₹${latestRevenue.revenue.toLocaleString("en-IN")} (${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs prior month). Total: ₹${snapshot.totalRevenue.toLocaleString("en-IN")}.`,
      impact: "high",
      recommendation:
        revenueChange < 0
          ? "Launch promotions on top destinations to boost bookings."
          : "Maintain momentum with early-bird discounts.",
    },
    {
      category: "demand",
      title: "Top Destination Demand",
      insight: topDest
        ? `${topDest.name} leads with ${topDest.count} packages.`
        : "Add more destination packages to track demand.",
      impact: "high",
      recommendation: topDest
        ? `Increase inventory and partnerships in ${topDest.name}.`
        : "Publish packages for Goa, Kerala, and Rajasthan.",
    },
    {
      category: "bookings",
      title: "Booking Pipeline",
      insight: `${snapshot.totalBookings} total bookings. ${pendingBookings} with partial payment.`,
      impact: "medium",
      recommendation: "Send payment reminders for partial bookings within 24 hours.",
    },
    {
      category: "operations",
      title: "Fleet Utilization",
      insight: `${snapshot.activeVehicles} active vehicles serving ${snapshot.totalCustomers} customers.`,
      impact: "low",
      recommendation: "Review vehicle availability before peak season.",
    },
  ];
}

function ruleBasedSummary(insights: AnalyticsInsight[]): string {
  return insights
    .filter((i) => i.impact === "high")
    .map((i) => `${i.title}: ${i.insight}`)
    .join(" ");
}

export async function runAnalyticsAgent(): Promise<AnalyticsAgentResult> {
  const snapshot = await getAdminAnalytics();
  const insights = ruleBasedInsights(snapshot);

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: JSON.stringify({
        snapshot,
        recentBookings: snapshot.recentBookings.length,
      }),
    },
  ];

  const { content, provider } = await routeCompletion(
    SYSTEM_PROMPT,
    messages,
    () => ruleBasedSummary(insights)
  );

  return {
    snapshot,
    insights,
    summary: content,
    provider,
  };
}
