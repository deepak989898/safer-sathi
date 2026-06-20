import type { AiRatingRecord } from "@/lib/ai-center/types";

export interface ReviewAnalysis {
  averageRating: number;
  reviewCount: number;
  positiveCount: number;
  negativeCount: number;
  mostLovedHotel?: string;
  mostLovedVehicle?: string;
  mostLovedDestination?: string;
  topPositiveThemes: string[];
  topNegativeThemes: string[];
}

export function analyzeReviewSentiment(text: string): "positive" | "negative" | "neutral" {
  const lower = text.toLowerCase();
  const negative = ["bad", "worst", "dirty", "rude", "delay", "complaint", "खराब", "बुरा"];
  const positive = ["great", "excellent", "amazing", "love", "wonderful", "best", "शानदार", "अच्छा"];
  const neg = negative.filter((w) => lower.includes(w)).length;
  const pos = positive.filter((w) => lower.includes(w)).length;
  if (neg > pos) return "negative";
  if (pos > neg) return "positive";
  return "neutral";
}

export function analyzeReviews(records: AiRatingRecord[]): ReviewAnalysis {
  const approved = records.filter((r) => r.status === "approved");
  const avg =
    approved.length > 0
      ? approved.reduce((s, r) => s + r.rating, 0) / approved.length
      : 0;

  const hotelCounts: Record<string, number> = {};
  const vehicleCounts: Record<string, number> = {};
  const destCounts: Record<string, number> = {};

  for (const r of approved.filter((x) => x.rating >= 4)) {
    if (r.hotelName) hotelCounts[r.hotelName] = (hotelCounts[r.hotelName] ?? 0) + 1;
    if (r.vehicleName) vehicleCounts[r.vehicleName] = (vehicleCounts[r.vehicleName] ?? 0) + 1;
    if (r.destination) destCounts[r.destination] = (destCounts[r.destination] ?? 0) + 1;
  }

  const top = (map: Record<string, number>) =>
    Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    averageRating: Math.round(avg * 10) / 10,
    reviewCount: approved.length,
    positiveCount: approved.filter((r) => r.sentiment === "positive").length,
    negativeCount: approved.filter((r) => r.sentiment === "negative").length,
    mostLovedHotel: top(hotelCounts),
    mostLovedVehicle: top(vehicleCounts),
    mostLovedDestination: top(destCounts),
    topPositiveThemes: ["Great service", "Beautiful destination", "Comfortable stay"],
    topNegativeThemes: ["Delays", "Room cleanliness", "Pricing concerns"],
  };
}

export function buildReviewAiSummary(record: AiRatingRecord): string {
  if (record.rating >= 4) {
    return `Positive ${record.rating}★ review for ${record.serviceName}. Customer enjoyed ${record.destination ?? "the trip"}.`;
  }
  if (record.rating <= 2) {
    return `Negative ${record.rating}★ review — follow up on ${record.complaints ?? "customer concerns"}.`;
  }
  return `Neutral ${record.rating}★ review with mixed feedback.`;
}
