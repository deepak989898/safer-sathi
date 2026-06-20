import { getHotels, getPackages, getVehicles } from "@/lib/data-service";
import { routeCompletion } from "@/lib/ai/router";
import type {
  KeywordCategory,
  SeoKeyword,
} from "@/lib/ai-center/types";
import { computeSeoScore, slugify } from "@/lib/ai-center/utils";

const DESTINATIONS = [
  "Manali",
  "Shimla",
  "Goa",
  "Kashmir",
  "Kerala",
  "Jaipur",
  "Darjeeling",
  "Rishikesh",
  "Udaipur",
  "Delhi",
  "Lucknow",
  "Mumbai",
];

const KEYWORD_TEMPLATES: Record<
  KeywordCategory,
  (ctx: { dest: string; city: string }) => string[]
> = {
  tour_packages: (ctx) => [
    `${ctx.dest} Tour Package`,
    `${ctx.dest} Tour Package From ${ctx.city}`,
    `${ctx.dest} Honeymoon Package`,
    `Budget ${ctx.dest} Tour Package`,
    `${ctx.dest} Family Tour Package`,
  ],
  hotels: (ctx) => [
    `Best Hotels In ${ctx.dest}`,
    `Luxury Hotels In ${ctx.dest}`,
    `Budget Hotels In ${ctx.dest}`,
    `${ctx.dest} Resort Booking`,
  ],
  vehicles: (ctx) => [
    `Taxi Service In ${ctx.city}`,
    `Tempo Traveller In ${ctx.city}`,
    `Car Rental In ${ctx.dest}`,
    `SUV Rental For ${ctx.dest} Trip`,
  ],
  destinations: (ctx) => [
    `Best Places To Visit In ${ctx.dest}`,
    `Top Attractions In ${ctx.dest}`,
    `Things To Do In ${ctx.dest}`,
  ],
  travel_guides: (ctx) => [
    `Best Time To Visit ${ctx.dest}`,
    `${ctx.dest} Travel Guide`,
    `${ctx.dest} Trip Cost`,
    `How To Reach ${ctx.dest}`,
  ],
  local: (ctx) => [
    `${ctx.dest} Weekend Getaway From ${ctx.city}`,
    `${ctx.city} To ${ctx.dest} Distance`,
    `${ctx.dest} Local Sightseeing`,
  ],
};

function hashKeyword(keyword: string): number {
  let h = 0;
  for (let i = 0; i < keyword.length; i++) h = (h << 5) - h + keyword.charCodeAt(i);
  return Math.abs(h);
}

function buildKeywordRecord(
  keyword: string,
  category: KeywordCategory,
  destination?: string
): SeoKeyword {
  const seed = hashKeyword(keyword);
  const searchVolume = 800 + (seed % 9200);
  const competition =
    seed % 3 === 0 ? "low" : seed % 3 === 1 ? "medium" : ("high" as const);
  const trendScore = 40 + (seed % 60);
  const now = new Date().toISOString();

  return {
    id: `kw_${slugify(keyword)}_${seed.toString(36).slice(0, 6)}`,
    keyword,
    searchVolume,
    competition,
    trendScore,
    category,
    destination,
    seoScore: computeSeoScore({ searchVolume, competition, trendScore }),
    status: "pending",
    createdAt: now,
  };
}

export async function generateKeywordResearch(limit = 10): Promise<SeoKeyword[]> {
  const [packages, hotels, vehicles] = await Promise.all([
    getPackages(),
    getHotels(),
    getVehicles(),
  ]);

  const destSet = new Set<string>(DESTINATIONS);
  packages.slice(0, 8).forEach((p) => p.cities.forEach((c) => destSet.add(c)));
  hotels.slice(0, 5).forEach((h) => destSet.add(h.city));
  const destinations = [...destSet].slice(0, 12);
  const pickupCities = ["Delhi", "Lucknow", "Mumbai", "Bangalore", "Jaipur"];

  const categories: KeywordCategory[] = [
    "tour_packages",
    "hotels",
    "vehicles",
    "destinations",
    "travel_guides",
    "local",
  ];

  const candidates: SeoKeyword[] = [];
  const seen = new Set<string>();

  for (const dest of destinations) {
    for (const category of categories) {
      const city = pickupCities[hashKeyword(dest + category) % pickupCities.length];
      const phrases = KEYWORD_TEMPLATES[category]({ dest, city });
      for (const phrase of phrases) {
        const key = phrase.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(buildKeywordRecord(phrase, category, dest));
        if (candidates.length >= limit * 3) break;
      }
      if (candidates.length >= limit * 3) break;
    }
    if (candidates.length >= limit * 3) break;
  }

  candidates.sort((a, b) => b.seoScore - a.seoScore);
  let selected = candidates.slice(0, limit);

  try {
    const context = {
      packages: packages.slice(0, 5).map((p) => p.title.en),
      hotels: hotels.slice(0, 5).map((h) => h.name.en),
      vehicles: vehicles.slice(0, 5).map((v) => v.name.en),
    };
    const { content } = await routeCompletion(
      "You are Safar Sathi SEO keyword researcher for Indian travel. Return JSON array of 5 high-value long-tail keywords only.",
      [
        {
          role: "user",
          content: `Suggest 5 keywords for tour packages, hotels, vehicles in India. Context: ${JSON.stringify(context)}. Return JSON: {"keywords":["..."]}`,
        },
      ],
      async () => JSON.stringify({ keywords: selected.slice(0, 5).map((k) => k.keyword) }),
      { maxTokens: 300, timeoutMs: 8000 }
    );
    const parsed = JSON.parse(content) as { keywords?: string[] };
    if (parsed.keywords?.length) {
      for (const kw of parsed.keywords.slice(0, 5)) {
        const key = kw.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        selected.push(
          buildKeywordRecord(kw, "travel_guides", destinations[0])
        );
      }
      selected = selected.sort((a, b) => b.seoScore - a.seoScore).slice(0, limit);
    }
  } catch {
    // rule-based fallback is enough
  }

  return selected.slice(0, limit);
}
