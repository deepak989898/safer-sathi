import { demoAnalytics, demoBookings, demoPackages } from "@/data/demo-data";
import { getAnalytics } from "@/lib/data-service";
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
  snapshot: typeof demoAnalytics;
  insights: AnalyticsInsight[];
  summary: string;
  provider: AIProvider;
}

function ruleBasedInsights(): AnalyticsInsight[] {
  const analytics = demoAnalytics;
  const topDest = analytics.topDestinations[0];
  const latestRevenue = analytics.revenueByMonth[analytics.revenueByMonth.length - 1];
  const prevRevenue = analytics.revenueByMonth[analytics.revenueByMonth.length - 2];
  const revenueChange = ((latestRevenue.revenue - prevRevenue.revenue) / prevRevenue.revenue) * 100;

  const pendingBookings = demoBookings.filter((b) => b.paymentStatus === "partial").length;
  const topPackage = demoPackages.find((p) => p.featured);

  return [
    {
      category: "revenue",
      title: "Monthly Revenue Trend",
      insight: `June revenue ₹${latestRevenue.revenue.toLocaleString("en-IN")} (${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(1)}% vs May). Total YTD: ₹${analytics.totalRevenue.toLocaleString("en-IN")}.`,
      impact: "high",
      recommendation: revenueChange < 0
        ? "Launch monsoon promotions for Kerala and Goa packages to boost June-July bookings."
        : "Maintain momentum with early-bird discounts on top destinations.",
    },
    {
      category: "demand",
      title: "Top Destination Demand",
      insight: `${topDest.name} leads with ${topDest.count} bookings, followed by Goa (${analytics.topDestinations[1].count}).`,
      impact: "high",
      recommendation: `Increase vehicle inventory and hotel partnerships in ${topDest.name}.`,
    },
    {
      category: "bookings",
      title: "Conversion & Pipeline",
      insight: `Conversion rate ${analytics.conversionRate}%. ${pendingBookings} bookings with partial payment awaiting completion.`,
      impact: "medium",
      recommendation: "Trigger automated WhatsApp reminders for partial-payment bookings within 24 hours.",
    },
    {
      category: "marketing",
      title: "Featured Package Performance",
      insight: topPackage
        ? `"${topPackage.title.en}" is featured with ${topPackage.reviewCount} reviews and ${topPackage.rating}★ rating.`
        : "No featured package data available.",
      impact: "medium",
      recommendation: "Promote Golden Triangle and Kerala honeymoon packages in social campaigns.",
    },
    {
      category: "operations",
      title: "Fleet Utilization",
      insight: `${analytics.activeVehicles} active vehicles serving ${analytics.totalCustomers} customers across ${analytics.totalBookings} bookings.`,
      impact: "low",
      recommendation: "Review tempo traveller demand for group tours in peak season (Oct–Mar).",
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
  const snapshot = await getAnalytics();
  const insights = ruleBasedInsights();

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: JSON.stringify({ snapshot, recentBookings: demoBookings.length }),
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
