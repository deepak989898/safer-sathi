import { getPackages } from "@/lib/data-service";
import { routeCompletion, type AIProvider } from "../router";
import type { ChatMessage } from "../openai";

const SYSTEM_PROMPT = `You are Safar Sathi AI SEO Agent. Generate meta tags, Open Graph data,
and JSON-LD schema markup for travel pages. Optimize for Indian travel keywords.`;

export interface SEOAgentInput {
  pageType: "package" | "hotel" | "blog" | "landing";
  slug?: string;
  title?: string;
  description?: string;
  locale?: "en" | "hi";
}

export interface SEOMetaTags {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  ogImage?: string;
  canonicalUrl: string;
}

export interface SEOSchema {
  "@context": string;
  "@type": string;
  [key: string]: unknown;
}

export interface SEOAgentResult {
  meta: SEOMetaTags;
  schema: SEOSchema;
  provider: AIProvider;
}

async function ruleBasedSEO(input: SEOAgentInput): Promise<{ meta: SEOMetaTags; schema: SEOSchema }> {
  const packages = await getPackages();
  const pkg = input.slug
    ? packages.find((p) => p.slug === input.slug) ?? packages[0]
    : packages[0];

  if (!pkg) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://safarsathi.com";
    return {
      meta: {
        title: input.title ?? "Safar Sathi Travel",
        description: input.description ?? "Book tours across India with Safar Sathi.",
        keywords: ["travel india", "safar sathi"],
        ogTitle: input.title ?? "Safar Sathi",
        ogDescription: input.description ?? "Book tours across India",
        canonicalUrl: baseUrl,
      },
      schema: { "@context": "https://schema.org", "@type": "WebPage", name: "Safar Sathi" },
    };
  }

  const title = input.title ?? pkg.title.en;
  const description =
    input.description ??
    pkg.description.en.slice(0, 155) + " | Book with Safar Sathi — India's trusted travel partner.";

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://safarsathi.com";
  const path = input.pageType === "package" ? `/packages/${pkg.slug}` : `/${input.pageType}`;

  const meta: SEOMetaTags = {
    title: `${title} | Safar Sathi Tours`,
    description,
    keywords: [
      "India travel",
      "tour packages",
      ...pkg.cities,
      pkg.category,
      "Safar Sathi",
    ],
    ogTitle: title,
    ogDescription: description,
    ogImage: pkg.images[0],
    canonicalUrl: `${baseUrl}${path}`,
  };

  const schema: SEOSchema = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: title,
    description: pkg.description.en,
    touristType: pkg.category,
    itinerary: {
      "@type": "ItemList",
      itemListElement: pkg.cities.map((city, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: city,
      })),
    },
    offers: {
      "@type": "Offer",
      price: pkg.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: meta.canonicalUrl,
    },
    provider: {
      "@type": "TravelAgency",
      name: "Safar Sathi",
      url: baseUrl,
    },
  };

  return { meta, schema };
}

export async function runSEOAgent(input: SEOAgentInput): Promise<SEOAgentResult> {
  const messages: ChatMessage[] = [
    { role: "user", content: JSON.stringify(input) },
  ];

  const fallback = await ruleBasedSEO(input);
  const { content: raw, provider } = await routeCompletion(
    SYSTEM_PROMPT,
    messages,
    async () => JSON.stringify(await ruleBasedSEO(input))
  );

  if (provider === "rule-based") {
    return { ...fallback, provider };
  }

  try {
    const parsed = JSON.parse(raw) as { meta: SEOMetaTags; schema: SEOSchema };
    return { meta: parsed.meta, schema: parsed.schema, provider };
  } catch {
    return { ...fallback, provider };
  }
}
