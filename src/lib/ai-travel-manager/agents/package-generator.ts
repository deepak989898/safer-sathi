import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { routeCompletion } from "@/lib/ai/router";
import {
  getCompetitorById,
  savePackageDraft,
  saveGeneratedImage,
} from "@/lib/ai-travel-manager/repository";
import { priceFromCompetitor, calculatePackagePrice } from "./price-calculator";
import type { AIPackageDraft } from "@/lib/ai-travel-manager/types";
import type { PackageCategory } from "@/types";

export interface GeneratePackageInput {
  destination: string;
  category?: PackageCategory;
  durationDays?: number;
  competitorId?: string;
  customName?: string;
  createdBy: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 52);
}

function pickCategory(destination: string, hint?: PackageCategory): PackageCategory {
  if (hint) return hint;
  const d = destination.toLowerCase();
  if (d.includes("honeymoon") || d.includes("kerala") || d.includes("maldives")) return "honeymoon";
  if (d.includes("char dham") || d.includes("temple")) return "religious";
  if (d.includes("trek") || d.includes("manali")) return "adventure";
  if (d.includes("dubai") || d.includes("bali")) return "international";
  return "domestic";
}

function buildItinerary(destination: string, days: number) {
  return Array.from({ length: Math.min(days, 7) }, (_, i) => ({
    day: i + 1,
    title: {
      en: `Day ${i + 1}: ${destination}`,
      hi: `दिन ${i + 1}: ${destination}`,
    },
    description: {
      en: `Explore ${destination} with guided experiences and comfortable stays.`,
      hi: `${destination} में गाइडेड अनुभवों के साथ यात्रा।`,
    },
    activities: ["Sightseeing", "Local cuisine", "Transfers"],
  }));
}

export async function generatePackageDraft(
  input: GeneratePackageInput
): Promise<AIPackageDraft> {
  const destination = input.destination.trim();
  const category = pickCategory(destination, input.category);
  const days = input.durationDays ?? 6;
  const competitor = input.competitorId
    ? getCompetitorById(input.competitorId)
    : null;

  const priceBreakdown = competitor
    ? priceFromCompetitor(competitor, category, days)
    : calculatePackagePrice({ category, durationDays: days });

  const titleEn =
    input.customName?.trim() ||
    `${destination} ${category.charAt(0).toUpperCase() + category.slice(1)} Experience`;

  const slug = slugify(`${destination}-${category}-${days}d`);
  const now = new Date().toISOString();

  const { content: descriptionEn } = await routeCompletion(
    `Write a compelling 2-sentence SEO travel package description for India.`,
    [{ role: "user", content: `${titleEn}, ${days} days, ₹${priceBreakdown.finalSellingPrice}` }],
    async () =>
      `Discover ${destination} on this ${days}-day curated journey with hotels, transport, and guided sightseeing included.`
  );

  const images = [
    TRAVEL_IMAGES.keralaBackwaters,
    TRAVEL_IMAGES.hotelLuxury,
    TRAVEL_IMAGES.goldenTriangle,
  ];

  const coverImage = await saveGeneratedImage({
    id: `img_pkg_${Date.now()}`,
    type: "package_cover",
    url: images[0].replace("w=800", "w=1920"),
    relatedId: `draft_${Date.now()}`,
    prompt: `Package cover for ${destination}`,
    createdAt: now,
  });

  const draft: AIPackageDraft = {
    id: `ai_pkg_${Date.now()}`,
    title: { en: titleEn, hi: `${destination} यात्रा पैकेज` },
    slug,
    seoSlug: slug,
    category,
    duration: days,
    durationLabel: {
      en: `${days - 1} Nights / ${days} Days`,
      hi: `${days - 1} रात / ${days} दिन`,
    },
    cities: [destination],
    hotels: competitor?.hotels ?? [`Premium Hotel ${destination}`],
    meals: ["Breakfast", "Dinner"],
    activities: competitor?.tourHighlights ?? ["Sightseeing", "Transfers"],
    price: priceBreakdown.finalSellingPrice,
    originalPrice: priceBreakdown.basePrice,
    images: [coverImage.url, ...images],
    description: { en: descriptionEn, hi: descriptionEn },
    itinerary: buildItinerary(destination, days),
    inclusions: (competitor?.inclusions ?? ["Transport", "Hotel", "Meals"]).map((x) => ({
      en: x,
      hi: x,
    })),
    exclusions: (competitor?.exclusions ?? ["Flights", "Personal expenses"]).map((x) => ({
      en: x,
      hi: x,
    })),
    rating: 4.6,
    reviewCount: 0,
    featured: false,
    publishStatus: "draft",
    approvalStatus: "draft",
    competitorId: competitor?.id,
    termsAndConditions: {
      en: "Standard Safar Sathi terms apply. Itinerary may change due to weather.",
      hi: "मानक शर्तें लागू। मौसम के कारण यात्रा कार्यक्रम बदल सकता है।",
    },
    cancellationPolicy: {
      en: "Free cancellation up to 7 days before departure. 50% charge within 7 days.",
      hi: "प्रस्थान से 7 दिन पहले मुफ्त रद्दीकरण।",
    },
    faqs: (competitor?.faqs ?? []).map((f) => ({
      question: { en: f.question, hi: f.question },
      answer: { en: f.answer, hi: f.answer },
    })),
    tourHighlights: (competitor?.tourHighlights ?? [`Best of ${destination}`]).map((h) => ({
      en: h,
      hi: h,
    })),
    bestSeason: {
      en: competitor?.bestTimeToVisit ?? "October to March",
      hi: competitor?.bestTimeToVisit ?? "अक्टूबर से मार्च",
    },
    tags: [category, destination.toLowerCase(), "ai-generated"],
    priceBreakdown,
    generatedImages: [coverImage],
    proposedBy: "ai_market_agent",
    marketAnalysis: {
      en: `AI-generated from ${competitor ? competitor.websiteName : "market data"}. Competitive price ₹${priceBreakdown.finalSellingPrice.toLocaleString("en-IN")}.`,
      hi: `AI द्वारा उत्पन्न पैकेज।`,
    },
    createdAt: now,
    updatedAt: now,
  };

  draft.generatedImages![0].relatedId = draft.id;
  return savePackageDraft(draft);
}
