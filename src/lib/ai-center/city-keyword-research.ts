import {
  buildKeywordFromGoogleSuggestion,
  fetchGoogleSuggestQueries,
  fetchSerpRelatedSearches,
} from "@/lib/ai-center/google-keyword-research";
import type { KeywordCategory, SeoKeyword } from "@/lib/ai-center/types";
import { computeSeoScore, slugify } from "@/lib/ai-center/utils";

const TRAVEL_DESTINATIONS = [
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
  "Mumbai",
  "Nainital",
  "Mussoorie",
  "Agra",
  "Varanasi",
  "Amritsar",
  "Ooty",
  "Munnar",
  "Leh",
  "Gangtok",
  "Haridwar",
  "Chandigarh",
  "Bangalore",
  "Hyderabad",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Lucknow",
  "Chennai",
  "Coorg",
];

function hashKeyword(keyword: string): number {
  let h = 0;
  for (let i = 0; i < keyword.length; i++) h = (h << 5) - h + keyword.charCodeAt(i);
  return Math.abs(h);
}

function titleCaseCity(city: string): string {
  return city
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function inferCategory(keyword: string): KeywordCategory {
  const l = keyword.toLowerCase();
  if (/\b(hotel|resort|homestay|stay)\b/.test(l)) return "hotels";
  if (/\b(taxi|cab|tempo|car rental|rent car|suv|innova|bus booking|vehicle)\b/.test(l)) {
    return "vehicles";
  }
  if (/\b(places to visit|attractions|things to do|sightseeing)\b/.test(l)) return "destinations";
  if (/\b(tour package|honeymoon|family tour|group tour|holiday package)\b/.test(l)) {
    return "tour_packages";
  }
  if (/\b(best time|travel guide|trip cost|itinerary|distance)\b/.test(l)) return "travel_guides";
  return "local";
}

function buildCityKeywordRecord(
  keyword: string,
  originCity: string,
  destination?: string
): SeoKeyword {
  const cleaned = keyword.trim();
  const seed = hashKeyword(`${originCity}:${cleaned}`);
  const searchVolume = 500 + (seed % 8500);
  const competition =
    seed % 4 === 0 ? "low" : seed % 4 === 1 ? "medium" : ("high" as const);
  const trendScore = 42 + (seed % 55);
  const now = new Date().toISOString();

  return {
    id: `kw_city_${slugify(originCity)}_${slugify(cleaned)}_${seed.toString(36).slice(0, 5)}`,
    keyword: cleaned,
    searchVolume,
    competition,
    trendScore,
    category: inferCategory(cleaned),
    destination: destination ?? originCity,
    seoScore: computeSeoScore({ searchVolume, competition, trendScore }),
    status: "pending",
    source: "city_research",
    createdAt: now,
  };
}

function buildCityTemplatePhrases(city: string): string[] {
  const phrases: string[] = [];
  const dests = TRAVEL_DESTINATIONS.filter(
    (dest) => dest.toLowerCase() !== city.toLowerCase()
  );

  for (const dest of dests) {
    phrases.push(
      `${city} to ${dest}`,
      `${city} to ${dest} tour`,
      `${city} to ${dest} tour package`,
      `${city} to ${dest} package`,
      `tour package from ${city} to ${dest}`,
      `${city} to ${dest} cab`,
      `${city} to ${dest} bus`,
      `${city} to ${dest} trip`
    );
  }

  const localPhrases = [
    `online bus booking in ${city}`,
    `${city} bus booking`,
    `${city} rent car`,
    `car rental in ${city}`,
    `tempo traveller in ${city}`,
    `tempo traveller hire ${city}`,
    `taxi service in ${city}`,
    `cab booking ${city}`,
    `holiday package from ${city}`,
    `tour packages from ${city}`,
    `travel agency in ${city}`,
    `best travel agency in ${city}`,
    `best tour operator in ${city}`,
    `${city} tour packages`,
    `honeymoon package from ${city}`,
    `family tour from ${city}`,
    `group tour from ${city}`,
    `weekend trip from ${city}`,
    `${city} local sightseeing`,
    `budget tour from ${city}`,
    `luxury tour from ${city}`,
    `best hotels near ${city}`,
    `airport pickup ${city}`,
    `innova rental ${city}`,
    `suv rental ${city}`,
    `${city} to manali volvo`,
    `${city} travel packages`,
    `cheap tour package from ${city}`,
  ];

  return [...phrases, ...localPhrases];
}

function buildCityGoogleSeeds(city: string): string[] {
  return [
    `${city} to`,
    `${city} tour package`,
    `tour from ${city}`,
    `bus booking ${city}`,
    `car rental ${city}`,
    `tempo traveller ${city}`,
    `holiday package ${city}`,
    `travel agency ${city}`,
    `${city} to manali`,
    `${city} to goa`,
    `${city} to jaipur`,
    `cab ${city}`,
    `${city} honeymoon package`,
  ];
}

export interface CityKeywordResearchResult {
  city: string;
  keywords: SeoKeyword[];
  templateCount: number;
  googleSuggestCount: number;
  googleSerpCount: number;
}

export async function generateCityKeywordResearch(
  rawCity: string,
  limit = 100,
  excludeKeywords: string[] = []
): Promise<CityKeywordResearchResult> {
  const city = titleCaseCity(rawCity);
  if (!city || city.length < 2) {
    throw new Error("Please enter a valid city name.");
  }

  const excludeSet = new Set(excludeKeywords.map((k) => k.toLowerCase().trim()));
  const seen = new Set<string>(excludeSet);
  const collected: SeoKeyword[] = [];
  let templateCount = 0;
  let googleSuggestCount = 0;
  let googleSerpCount = 0;

  const addPhrase = (phrase: string, destination?: string) => {
    const key = phrase.toLowerCase().trim();
    if (!key || key.length < 4 || seen.has(key)) return false;
    seen.add(key);
    collected.push(buildCityKeywordRecord(phrase, city, destination));
    return true;
  };

  for (const phrase of buildCityTemplatePhrases(city)) {
    if (collected.length >= limit) break;
    const dest = TRAVEL_DESTINATIONS.find((d) =>
      phrase.toLowerCase().includes(` to ${d.toLowerCase()}`)
    );
    if (addPhrase(phrase, dest ?? city)) templateCount += 1;
  }

  const seeds = buildCityGoogleSeeds(city);
  for (const seed of seeds) {
    if (collected.length >= limit) break;
    const suggestions = await fetchGoogleSuggestQueries(seed);
    for (const suggestion of suggestions) {
      if (collected.length >= limit) break;
      const key = suggestion.toLowerCase();
      if (!key.includes(city.toLowerCase()) && !key.includes("near me")) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      const built = buildKeywordFromGoogleSuggestion(
        suggestion,
        TRAVEL_DESTINATIONS,
        collected.length,
        "google_suggest"
      );
      collected.push({
        ...built,
        id: `kw_city_${slugify(city)}_${slugify(suggestion)}_${hashKeyword(suggestion).toString(36).slice(0, 5)}`,
        source: "city_research",
        destination: city,
        category: inferCategory(suggestion),
      });
      googleSuggestCount += 1;
    }
  }

  if (process.env.SERP_API_KEY?.trim() && collected.length < limit) {
    for (const seed of seeds.slice(0, 4)) {
      if (collected.length >= limit) break;
      const related = await fetchSerpRelatedSearches(seed);
      for (const phrase of related) {
        if (collected.length >= limit) break;
        const key = phrase.toLowerCase();
        if (seen.has(key)) continue;
        if (!key.includes(city.toLowerCase()) && !/\b(tour|travel|cab|bus|package|hotel)\b/i.test(key)) {
          continue;
        }
        seen.add(key);
        collected.push(buildCityKeywordRecord(phrase, city));
        googleSerpCount += 1;
      }
    }
  }

  collected.sort((a, b) => b.seoScore - a.seoScore);

  return {
    city,
    keywords: collected.slice(0, limit),
    templateCount,
    googleSuggestCount,
    googleSerpCount,
  };
}
