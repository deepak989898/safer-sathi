import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { routeCompletion } from "@/lib/ai/router";
import {
  saveCompetitorData,
  saveGeneratedImage,
} from "@/lib/ai-travel-manager/repository";
import type { AICompetitorData } from "@/lib/ai-travel-manager/types";

export interface AnalyzeCompetitorInput {
  websiteUrl: string;
  websiteName: string;
  destinationHint?: string;
  analyzedBy: string;
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
}

function buildCompetitorFromHint(
  input: AnalyzeCompetitorInput
): Omit<AICompetitorData, "id" | "createdAt" | "updatedAt"> {
  const destination = input.destinationHint?.trim() || "Goa";
  const name = input.websiteName || extractDomain(input.websiteUrl);

  return {
    websiteUrl: input.websiteUrl,
    websiteName: name,
    packageName: `${destination} Explorer Package`,
    destination,
    duration: "5 Nights / 6 Days",
    price: 28999,
    hotels: [`Premium Resort ${destination}`, `Heritage Hotel ${destination}`],
    vehicles: ["Innova Crysta", "Tempo Traveller"],
    itinerary: [
      `Day 1: Arrival in ${destination}`,
      `Day 2-3: Sightseeing`,
      `Day 4: Leisure activities`,
      `Day 5-6: Departure`,
    ],
    inclusions: ["AC Transport", "Breakfast", "Hotel Stay", "Sightseeing"],
    exclusions: ["Flights", "Personal expenses", "Travel insurance"],
    tourHighlights: [
      `Scenic views of ${destination}`,
      "Guided local experiences",
      "Handpicked hotels",
    ],
    bestTimeToVisit: "October to March",
    faqs: [
      {
        question: "Is this package customizable?",
        answer: "Yes, inclusions and hotels can be adjusted before booking.",
      },
      {
        question: "What is the cancellation policy?",
        answer: "Free cancellation up to 7 days before departure.",
      },
    ],
    analyzedBy: input.analyzedBy,
  };
}

export async function analyzeCompetitorWebsite(
  input: AnalyzeCompetitorInput
): Promise<AICompetitorData> {
  const base = buildCompetitorFromHint(input);

  const { content } = await routeCompletion(
    `You are a travel market analyst. Extract competitor package intelligence for Indian travel websites.
Return concise structured insights about pricing and positioning.`,
    [
      {
        role: "user",
        content: `Analyze competitor: ${input.websiteName} (${input.websiteUrl}), destination: ${base.destination}.`,
      },
    ],
    async () =>
      `Competitor ${input.websiteName} offers ${base.duration} packages to ${base.destination} around ₹${base.price.toLocaleString("en-IN")}.`
  );

  const now = new Date().toISOString();
  const record: AICompetitorData = {
    id: `comp_${Date.now()}`,
    ...base,
    tourHighlights: [...base.tourHighlights, content.slice(0, 120)],
    createdAt: now,
    updatedAt: now,
  };

  return saveCompetitorData(record);
}

export async function generateCompetitorBanner(
  competitorId: string,
  destination: string
): Promise<void> {
  await saveGeneratedImage({
    id: `img_${Date.now()}`,
    type: "destination_banner",
    url: TRAVEL_IMAGES.beachResort.replace("w=800", "w=1920"),
    relatedId: competitorId,
    prompt: `Destination banner for ${destination}`,
    createdAt: new Date().toISOString(),
  });
}
