import { getHotels, getPackages, getVehicles } from "@/lib/data-service";
import { discoverGoogleKeywords } from "@/lib/ai-center/google-keyword-research";
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
  "Nainital",
  "Mussoorie",
  "Agra",
  "Varanasi",
  "Amritsar",
  "Ooty",
  "Munnar",
  "Leh",
];

const PICKUP_CITIES = [
  "Delhi",
  "Lucknow",
  "Mumbai",
  "Bangalore",
  "Jaipur",
  "Chandigarh",
  "Kolkata",
  "Hyderabad",
  "Pune",
  "Ahmedabad",
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
    `${ctx.dest} Group Tour From ${ctx.city}`,
    `${ctx.dest} Adventure Tour Package`,
  ],
  hotels: (ctx) => [
    `Best Hotels In ${ctx.dest}`,
    `Luxury Hotels In ${ctx.dest}`,
    `Budget Hotels In ${ctx.dest}`,
    `${ctx.dest} Resort Booking`,
    `${ctx.dest} Homestay Booking`,
    `Couple Friendly Hotels In ${ctx.dest}`,
  ],
  vehicles: (ctx) => [
    `Taxi Service In ${ctx.city}`,
    `Tempo Traveller In ${ctx.city}`,
    `Car Rental In ${ctx.dest}`,
    `SUV Rental For ${ctx.dest} Trip`,
    `${ctx.city} To ${ctx.dest} Cab Fare`,
    `Innova Rental For ${ctx.dest}`,
  ],
  destinations: (ctx) => [
    `Best Places To Visit In ${ctx.dest}`,
    `Top Attractions In ${ctx.dest}`,
    `Things To Do In ${ctx.dest}`,
    `${ctx.dest} Sightseeing Places`,
    `Famous Tourist Spots In ${ctx.dest}`,
  ],
  travel_guides: (ctx) => [
    `Best Time To Visit ${ctx.dest}`,
    `${ctx.dest} Travel Guide`,
    `${ctx.dest} Trip Cost`,
    `How To Reach ${ctx.dest}`,
    `${ctx.dest} Weather By Month`,
    `${ctx.dest} Itinerary 5 Days`,
  ],
  local: (ctx) => [
    `${ctx.dest} Weekend Getaway From ${ctx.city}`,
    `${ctx.city} To ${ctx.dest} Distance`,
    `${ctx.dest} Local Sightseeing`,
    `${ctx.dest} Road Trip From ${ctx.city}`,
    `${ctx.dest} Package With Cab`,
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
  destination?: string,
  source: SeoKeyword["source"] = "template"
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
    source,
    createdAt: now,
  };
}

function buildCandidatePool(
  destinations: string[],
  excludeSet: Set<string>,
  rotation: number
): SeoKeyword[] {
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
      const city =
        PICKUP_CITIES[(hashKeyword(dest + category) + rotation) % PICKUP_CITIES.length];
      const phrases = KEYWORD_TEMPLATES[category]({ dest, city });
      for (const phrase of phrases) {
        const key = phrase.toLowerCase();
        if (seen.has(key) || excludeSet.has(key)) continue;
        seen.add(key);
        candidates.push(buildKeywordRecord(phrase, category, dest));
      }
    }
  }

  return candidates;
}

export interface KeywordResearchResult {
  keywords: SeoKeyword[];
  poolSize: number;
  excludedExisting: number;
  googleSuggestCount: number;
  googleSerpCount: number;
}

export async function generateKeywordResearch(
  limit = 10,
  excludeKeywords: string[] = []
): Promise<KeywordResearchResult> {
  const [packages, hotels, vehicles] = await Promise.all([
    getPackages(),
    getHotels(),
    getVehicles(),
  ]);

  const destSet = new Set<string>(DESTINATIONS);
  packages.forEach((p) => p.cities.forEach((c) => destSet.add(c)));
  hotels.forEach((h) => destSet.add(h.city));
  const destinations = [...destSet];

  const excludeSet = new Set(excludeKeywords.map((k) => k.toLowerCase().trim()));
  const rotation = excludeKeywords.length;

  const googleDiscovery = await discoverGoogleKeywords(
    destinations,
    excludeSet,
    Math.max(limit * 3, 20)
  );

  let candidates: SeoKeyword[] = [...googleDiscovery.keywords];
  const seen = new Set(candidates.map((c) => c.keyword.toLowerCase()));

  const templatePool = buildCandidatePool(destinations, excludeSet, rotation);
  for (const c of templatePool) {
    const key = c.keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(c);
  }

  if (candidates.length < limit) {
    const extra = buildCandidatePool(destinations, excludeSet, rotation + 7);
    for (const c of extra) {
      const key = c.keyword.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(c);
    }
  }

  let poolSize = candidates.length;

  candidates.sort((a, b) => b.seoScore - a.seoScore);
  let selected = candidates.slice(0, limit);

  try {
    const context = {
      packages: packages.slice(0, 5).map((p) => p.title.en),
      hotels: hotels.slice(0, 5).map((h) => h.name.en),
      vehicles: vehicles.slice(0, 5).map((v) => v.name.en),
      alreadyUsed: excludeKeywords.slice(0, 20),
    };
    const { content } = await routeCompletion(
      "You are Safar Sathi SEO keyword researcher for Indian travel. Return JSON array of NEW long-tail keywords not in alreadyUsed list.",
      [
        {
          role: "user",
          content: `Suggest ${limit} NEW unique India travel SEO keywords (tours, hotels, cabs). Do NOT repeat: ${JSON.stringify(context.alreadyUsed)}. Context: ${JSON.stringify({ packages: context.packages, hotels: context.hotels })}. Return JSON: {"keywords":["..."]}`,
        },
      ],
      async () =>
        JSON.stringify({
          keywords: selected.slice(0, Math.min(5, limit)).map((k) => k.keyword),
        }),
      { maxTokens: 400, timeoutMs: 8000 }
    );
    const parsed = JSON.parse(content) as { keywords?: string[] };
    if (parsed.keywords?.length) {
      const seen = new Set([
        ...excludeSet,
        ...selected.map((k) => k.keyword.toLowerCase()),
      ]);
      for (const kw of parsed.keywords) {
        const key = kw.toLowerCase().trim();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        selected.push(
          buildKeywordRecord(kw, "travel_guides", destinations[rotation % destinations.length], "ai")
        );
      }
      selected = selected
        .filter((k) => !excludeSet.has(k.keyword.toLowerCase()))
        .sort((a, b) => b.seoScore - a.seoScore)
        .slice(0, limit);
    }
  } catch {
    // rule-based pool is enough
  }

  return {
    keywords: selected.slice(0, limit),
    poolSize,
    excludedExisting: excludeKeywords.length,
    googleSuggestCount: googleDiscovery.suggestCount,
    googleSerpCount: googleDiscovery.serpCount,
  };
}
