import { TRAVEL_IMAGES } from "@/lib/media/travel-images";
import { addPackageDraft, reloadPackagesStore, slugExists } from "@/lib/package-store";
import { routeCompletion } from "@/lib/ai/router";
import type { PackageCategory, TourPackage } from "@/types";

export interface MarketPackageInput {
  destination: string;
  category?: PackageCategory;
  durationDays?: number;
  locale?: "en" | "hi";
}

const MARKET_BENCHMARKS: Record<
  PackageCategory,
  { min: number; max: number; perDay: number }
> = {
  domestic: { min: 18000, max: 35000, perDay: 4200 },
  international: { min: 65000, max: 120000, perDay: 8500 },
  religious: { min: 22000, max: 45000, perDay: 3800 },
  adventure: { min: 15000, max: 32000, perDay: 4500 },
  family: { min: 20000, max: 40000, perDay: 4000 },
  honeymoon: { min: 28000, max: 55000, perDay: 5200 },
};

const DESTINATION_IMAGES: Record<string, string[]> = {
  goa: [TRAVEL_IMAGES.beachResort, TRAVEL_IMAGES.hotelLuxury],
  kerala: [TRAVEL_IMAGES.keralaBackwaters, TRAVEL_IMAGES.beachResort],
  rajasthan: [TRAVEL_IMAGES.goldenTriangle, TRAVEL_IMAGES.hotelLake],
  manali: [TRAVEL_IMAGES.manaliAdventure, TRAVEL_IMAGES.charDham],
  default: [TRAVEL_IMAGES.hotelLuxury, TRAVEL_IMAGES.goldenTriangle],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function pickCategory(destination: string): PackageCategory {
  const d = destination.toLowerCase();
  if (d.includes("char dham") || d.includes("temple") || d.includes("pilgrim")) {
    return "religious";
  }
  if (d.includes("honeymoon") || d.includes("maldives") || d.includes("kerala")) {
    return "honeymoon";
  }
  if (d.includes("trek") || d.includes("adventure") || d.includes("manali")) {
    return "adventure";
  }
  if (d.includes("dubai") || d.includes("thailand") || d.includes("bali")) {
    return "international";
  }
  if (d.includes("family")) return "family";
  return "domestic";
}

function buildItinerary(destination: string, days: number) {
  return Array.from({ length: Math.min(days, 5) }, (_, i) => ({
    day: i + 1,
    title: {
      en: `Day ${i + 1} in ${destination}`,
      hi: `${destination} में दिन ${i + 1}`,
    },
    description: {
      en: `Guided sightseeing and curated experiences in ${destination}.`,
      hi: `${destination} में गाइडेड दर्शनीय स्थल और अनुभव।`,
    },
    activities: ["Sightseeing", "Local cuisine", "Hotel stay"],
  }));
}

function ruleBasedMarketPackage(input: MarketPackageInput): TourPackage {
  const destination = input.destination.trim() || "Goa";
  const category = input.category ?? pickCategory(destination);
  const days = input.durationDays ?? 5;
  const benchmark = MARKET_BENCHMARKS[category];
  const marketPrice = Math.round(
    Math.min(
      benchmark.max,
      Math.max(benchmark.min, benchmark.perDay * days * 0.95)
    )
  );
  const originalPrice = Math.round(marketPrice * 1.15);
  const key = Object.keys(DESTINATION_IMAGES).find((k) =>
    destination.toLowerCase().includes(k)
  );
  const images = DESTINATION_IMAGES[key ?? "default"];
  const slugBase = slugify(`${destination}-${category}-${days}d`);
  let slug = slugBase;
  let suffix = 1;
  while (slugExists(slug)) {
    slug = `${slugBase}-${suffix++}`;
  }

  const now = new Date().toISOString();

  return {
    id: `pkg_ai_${Date.now()}`,
    title: {
      en: `${destination} ${category.charAt(0).toUpperCase() + category.slice(1)} Escape`,
      hi: `${destination} ${category} यात्रा`,
    },
    slug,
    category,
    duration: days,
    durationLabel: {
      en: `${days - 1} Nights / ${days} Days`,
      hi: `${days - 1} रात / ${days} दिन`,
    },
    cities: [destination],
    hotels: [`Premium stay in ${destination}`],
    meals: ["Breakfast", "Dinner"],
    activities: ["Sightseeing", "Transfers", "Local guide"],
    price: marketPrice,
    originalPrice,
    images,
    description: {
      en: `AI-researched ${days}-day ${category} package for ${destination} priced at current market rates (₹${marketPrice.toLocaleString("en-IN")}). Includes hotels, meals, transfers, and guided experiences.`,
      hi: `${destination} के लिए ${days} दिन का ${category} पैकेज — बाजार भाव पर ₹${marketPrice.toLocaleString("en-IN")}। होटल, भोजन, ट्रांसफर और गाइड शामिल।`,
    },
    itinerary: buildItinerary(destination, days),
    inclusions: [
      { en: "AC transport", hi: "AC परिवहन" },
      { en: "Hotel accommodation", hi: "होटल रहना" },
      { en: "Breakfast & dinner", hi: "नाश्ता और रात का खाना" },
      { en: "Sightseeing as per itinerary", hi: "यात्रा कार्यक्रम के अनुसार दर्शन" },
    ],
    exclusions: [
      { en: "Airfare / train tickets", hi: "हवाई / ट्रेन टिकट" },
      { en: "Personal expenses", hi: "व्यक्तिगत खर्च" },
      { en: "Travel insurance", hi: "यात्रा बीमा" },
    ],
    rating: 4.5,
    reviewCount: 0,
    featured: false,
    publishStatus: "pending_approval",
    marketAnalysis: {
      en: `Market scan: comparable ${category} packages for ${destination} range ₹${benchmark.min.toLocaleString("en-IN")}–₹${benchmark.max.toLocaleString("en-IN")}. Proposed price ₹${marketPrice.toLocaleString("en-IN")} is competitive for ${days} days.`,
      hi: `बाजार विश्लेषण: ${destination} के ${category} पैकेज ₹${benchmark.min.toLocaleString("en-IN")}–₹${benchmark.max.toLocaleString("en-IN")} के बीच। प्रस्तावित मूल्य ₹${marketPrice.toLocaleString("en-IN")} प्रतिस्पर्धी है।`,
    },
    proposedBy: "ai_market_agent",
    createdAt: now,
    updatedAt: now,
  };
}

export async function runMarketPackageAgent(
  input: MarketPackageInput
): Promise<{ package: TourPackage; provider: string }> {
  await reloadPackagesStore();
  const destination = input.destination.trim() || "Goa";
  const category = input.category ?? pickCategory(destination);
  const days = input.durationDays ?? 5;
  const benchmark = MARKET_BENCHMARKS[category];

  const systemPrompt = `You are Safar Sathi Market Package Analyst for Indian travel.
Given a destination, suggest competitive market pricing and package positioning.
Respond in 2-3 sentences about market rates and why the price is fair.`;

  const { content, provider } = await routeCompletion(
    systemPrompt,
    [
      {
        role: "user",
        content: `Destination: ${destination}, Category: ${category}, Duration: ${days} days. Market range ₹${benchmark.min}-${benchmark.max}.`,
      },
    ],
    async () =>
      `Market analysis for ${destination}: ${days}-day ${category} packages typically sell at ₹${benchmark.min.toLocaleString("en-IN")}–₹${benchmark.max.toLocaleString("en-IN")}. Recommended competitive price aligns with current demand.`
  );

  const draft = ruleBasedMarketPackage(input);
  draft.marketAnalysis = {
    en: content,
    hi: content,
  };

  const saved = await addPackageDraft(draft);
  return { package: saved, provider };
}
