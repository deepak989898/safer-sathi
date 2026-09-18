import "server-only";

export type FreeStockProvider = "catalog" | "unsplash" | "pexels";

export interface FreeStockImageResult {
  url: string;
  provider: FreeStockProvider;
  photographer?: string;
  alt?: string;
}

/** Curated Unsplash travel photos (no API key required). */
const UNSPLASH_FALLBACK: Array<{ url: string; query: string }> = [
  {
    query: "india travel mountains",
    url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80",
  },
  {
    query: "goa beach",
    url: "https://images.unsplash.com/photo-1512343879784-a960cd40f2c8?auto=format&fit=crop&w=1600&q=80",
  },
  {
    query: "kerala backwaters",
    url: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1600&q=80",
  },
  {
    query: "rajasthan palace",
    url: "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1600&q=80",
  },
  {
    query: "himachal himalaya",
    url: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1600&q=80",
  },
  {
    query: "india temple travel",
    url: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1600&q=80",
  },
];

function pickFallback(query: string): FreeStockImageResult {
  const q = query.toLowerCase();
  const match =
    UNSPLASH_FALLBACK.find((item) =>
      item.query.split(" ").some((token) => q.includes(token))
    ) ?? UNSPLASH_FALLBACK[Math.abs(hash(query)) % UNSPLASH_FALLBACK.length];
  return {
    url: match.url,
    provider: "unsplash",
    photographer: "Unsplash",
    alt: query,
  };
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) h = (h * 31 + input.charCodeAt(i)) | 0;
  return h;
}

async function fetchUnsplash(query: string): Promise<FreeStockImageResult | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!key) return pickFallback(query);

  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return pickFallback(query);
    const data = (await res.json()) as {
      results?: Array<{
        urls?: { regular?: string };
        user?: { name?: string };
        alt_description?: string;
      }>;
    };
    const hit = data.results?.[0];
    const imageUrl = hit?.urls?.regular;
    if (!imageUrl) return pickFallback(query);
    return {
      url: imageUrl,
      provider: "unsplash",
      photographer: hit.user?.name,
      alt: hit.alt_description || query,
    };
  } catch {
    return pickFallback(query);
  }
}

async function fetchPexels(query: string): Promise<FreeStockImageResult | null> {
  const key = process.env.PEXELS_API_KEY?.trim();
  if (!key) return null;

  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    const res = await fetch(url, {
      headers: { Authorization: key },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      photos?: Array<{
        src?: { large?: string; landscape?: string };
        photographer?: string;
        alt?: string;
      }>;
    };
    const hit = data.photos?.[0];
    const imageUrl = hit?.src?.landscape || hit?.src?.large;
    if (!imageUrl) return null;
    return {
      url: imageUrl,
      provider: "pexels",
      photographer: hit.photographer,
      alt: hit.alt || query,
    };
  } catch {
    return null;
  }
}

/**
 * Free stock featured image from Unsplash / Pexels (or curated Unsplash fallback).
 * Catalog stock is handled separately via assignBlogImages.
 */
export async function fetchFreeStockFeaturedImage(input: {
  provider: Exclude<FreeStockProvider, "catalog">;
  query: string;
}): Promise<FreeStockImageResult> {
  const query = `${input.query} India travel`.trim();
  if (input.provider === "pexels") {
    return (await fetchPexels(query)) ?? (await fetchUnsplash(query)) ?? pickFallback(query);
  }
  return (await fetchUnsplash(query)) ?? (await fetchPexels(query)) ?? pickFallback(query);
}
