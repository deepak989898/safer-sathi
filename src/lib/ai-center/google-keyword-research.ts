import type { KeywordCategory, SeoKeyword } from "@/lib/ai-center/types";
import { computeSeoScore, slugify } from "@/lib/ai-center/utils";

export type KeywordDiscoverySource = "google_suggest" | "google_serp" | "template" | "ai";

const SUGGEST_URL = "https://suggestqueries.google.com/complete/search";

function hashKeyword(keyword: string): number {
  let h = 0;
  for (let i = 0; i < keyword.length; i++) h = (h << 5) - h + keyword.charCodeAt(i);
  return Math.abs(h);
}

function inferDestination(keyword: string, destinations: string[]): string | undefined {
  const lower = keyword.toLowerCase();
  for (const dest of destinations) {
    if (lower.includes(dest.toLowerCase())) return dest;
  }
  return undefined;
}

function inferCategory(keyword: string): KeywordCategory {
  const l = keyword.toLowerCase();
  if (/\b(hotel|resort|homestay|stay)\b/.test(l)) return "hotels";
  if (/\b(taxi|cab|tempo|car rental|suv|innova|vehicle)\b/.test(l)) return "vehicles";
  if (/\b(distance|route|by road|weekend)\b/.test(l)) return "local";
  if (/\b(places to visit|attractions|things to do|sightseeing)\b/.test(l)) return "destinations";
  if (/\b(tour package|honeymoon|family tour|group tour|package)\b/.test(l)) return "tour_packages";
  if (/\b(best time|how to reach|travel guide|trip cost|itinerary|weather)\b/.test(l)) return "travel_guides";
  return "travel_guides";
}

function estimateCompetition(keyword: string): "low" | "medium" | "high" {
  const words = keyword.split(/\s+/).length;
  if (words >= 6) return "low";
  if (/\b(best|top|cheap|budget|luxury|booking)\b/i.test(keyword)) return "medium";
  if (words <= 3) return "high";
  return "medium";
}

export function buildGoogleSeedQueries(destinations: string[]): string[] {
  const seeds = new Set<string>();
  for (const dest of destinations.slice(0, 10)) {
    seeds.add(`${dest} tour package`);
    seeds.add(`${dest} hotels`);
    seeds.add(`best places to visit in ${dest}`);
    seeds.add(`how to reach ${dest}`);
    seeds.add(`${dest} trip`);
    seeds.add(`delhi to ${dest}`);
  }
  seeds.add("manali tour package");
  seeds.add("shimla honeymoon package");
  seeds.add("goa beach hotels");
  return [...seeds];
}

/** Real Google Search autocomplete suggestions (what users type in Google). */
export async function fetchGoogleSuggestQueries(query: string): Promise<string[]> {
  const url = `${SUGGEST_URL}?client=firefox&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SafarSathiBot/1.0)",
        Accept: "application/json,text/plain,*/*",
      },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const text = await res.text();
    const data = JSON.parse(text) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[1])) return [];
    return (data[1] as unknown[])
      .filter((item): item is string => typeof item === "string" && item.trim().length > 2)
      .map((s) => s.trim());
  } catch (error) {
    console.warn(`Google suggest failed for "${query}":`, error);
    return [];
  }
}

/** Optional: SerpAPI related searches (set SERP_API_KEY in env). */
export async function fetchSerpRelatedSearches(query: string): Promise<string[]> {
  const apiKey = process.env.SERP_API_KEY?.trim();
  if (!apiKey) return [];

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("google_domain", "google.co.in");
  url.searchParams.set("gl", "in");
  url.searchParams.set("hl", "en");
  url.searchParams.set("num", "10");
  url.searchParams.set("api_key", apiKey);

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      related_searches?: { query?: string }[];
      related_questions?: { question?: string }[];
    };
    const related = [
      ...(data.related_searches?.map((r) => r.query).filter(Boolean) ?? []),
      ...(data.related_questions?.map((r) => r.question).filter(Boolean) ?? []),
    ] as string[];
    return related.map((s) => s.trim()).filter((s) => s.length > 2);
  } catch (error) {
    console.warn(`SerpAPI related search failed for "${query}":`, error);
    return [];
  }
}

export function buildKeywordFromGoogleSuggestion(
  keyword: string,
  destinations: string[],
  rank: number,
  source: KeywordDiscoverySource
): SeoKeyword {
  const cleaned = keyword.trim();
  const seed = hashKeyword(cleaned);
  const searchVolume = Math.max(600, 14_000 - rank * 850);
  const competition = estimateCompetition(cleaned);
  const trendScore = Math.max(35, 88 - rank * 4);
  const now = new Date().toISOString();

  return {
    id: `kw_${slugify(cleaned)}_${seed.toString(36).slice(0, 6)}`,
    keyword: cleaned,
    searchVolume,
    competition,
    trendScore,
    category: inferCategory(cleaned),
    destination: inferDestination(cleaned, destinations),
    seoScore: computeSeoScore({ searchVolume, competition, trendScore }),
    status: "pending",
    source,
    createdAt: now,
  };
}

async function runBatched<T>(
  items: string[],
  worker: (item: string) => Promise<T[]>,
  batchSize = 4
): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const results = await Promise.allSettled(batch.map(worker));
    for (const result of results) {
      if (result.status === "fulfilled") out.push(...result.value);
    }
  }
  return out;
}

export interface GoogleKeywordDiscoveryResult {
  keywords: SeoKeyword[];
  suggestCount: number;
  serpCount: number;
}

/** Discover keywords from Google autocomplete (+ optional SerpAPI related searches). */
export async function discoverGoogleKeywords(
  destinations: string[],
  excludeSet: Set<string>,
  maxResults = 30
): Promise<GoogleKeywordDiscoveryResult> {
  const seeds = buildGoogleSeedQueries(destinations);
  const seen = new Set<string>(excludeSet);
  const collected: SeoKeyword[] = [];
  let suggestCount = 0;
  let serpCount = 0;

  const hasSerp = Boolean(process.env.SERP_API_KEY?.trim());
  const serpSeeds = hasSerp ? seeds.slice(0, 4) : [];

  const suggestHits = await runBatched(
    seeds,
    async (seed) => {
      const suggestions = await fetchGoogleSuggestQueries(seed);
      const rows: SeoKeyword[] = [];
      suggestions.forEach((suggestion, rank) => {
        const key = suggestion.toLowerCase();
        if (seen.has(key) || key.length < 4) return;
        seen.add(key);
        rows.push(
          buildKeywordFromGoogleSuggestion(suggestion, destinations, rank, "google_suggest")
        );
        suggestCount += 1;
      });
      return rows;
    },
    4
  );

  for (const kw of suggestHits) {
    if (collected.length >= maxResults) break;
    collected.push(kw);
  }

  if (hasSerp && collected.length < maxResults) {
    const serpHits = await runBatched(
      serpSeeds,
      async (seed) => {
        const related = await fetchSerpRelatedSearches(seed);
        const rows: SeoKeyword[] = [];
        related.forEach((phrase, rank) => {
          const key = phrase.toLowerCase();
          if (seen.has(key) || key.length < 4) return;
          seen.add(key);
          rows.push(
            buildKeywordFromGoogleSuggestion(phrase, destinations, rank + 2, "google_serp")
          );
          serpCount += 1;
        });
        return rows;
      },
      2
    );

    for (const kw of serpHits) {
      if (collected.length >= maxResults) break;
      collected.push(kw);
    }
  }

  collected.sort((a, b) => b.seoScore - a.seoScore);
  return {
    keywords: collected.slice(0, maxResults),
    suggestCount,
    serpCount,
  };
}

export function isGoogleKeywordDiscoveryEnabled(): boolean {
  return true;
}

export function isSerpApiConfigured(): boolean {
  return Boolean(process.env.SERP_API_KEY?.trim());
}
