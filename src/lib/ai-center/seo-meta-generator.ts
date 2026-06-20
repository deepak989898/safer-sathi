import { appUrl } from "@/lib/site-config";
import { routeCompletion } from "@/lib/ai/router";
import type { SeoKeyword, SeoMetaRecord } from "@/lib/ai-center/types";
import { slugify } from "@/lib/ai-center/utils";

function defaultFaq(keyword: string, destination?: string): SeoMetaRecord["faq"] {
  const dest = destination ?? "India";
  return [
    {
      question: `What is the best time for ${keyword}?`,
      answer: `The ideal time depends on ${dest}. Generally October to March offers pleasant weather for most North India destinations.`,
    },
    {
      question: `How much does ${keyword} cost?`,
      answer: `Safar Sathi offers live pricing from budget to luxury tiers. Packages typically start from ₹8,000 per person.`,
    },
    {
      question: `Why book ${keyword} with Safar Sathi?`,
      answer: `Safar Sathi provides live hotel and vehicle prices, instant booking, and 24/7 support across India.`,
    },
  ];
}

export async function generateSeoMetaForKeyword(
  keyword: SeoKeyword
): Promise<SeoMetaRecord> {
  const slug = slugify(keyword.keyword);
  const canonicalUrl = appUrl(`/blog/${slug}`);
  const seoTitle = `${keyword.keyword} | Safar Sathi Travel Guide`;
  const seoDescription = `Plan ${keyword.keyword.toLowerCase()} with Safar Sathi. Live prices, hotels, vehicles & expert travel tips for ${keyword.destination ?? "India"}. Book now!`;

  const fallback: SeoMetaRecord = {
    id: `meta_${keyword.id}`,
    keywordId: keyword.id,
    keyword: keyword.keyword,
    seoTitle,
    seoDescription: seoDescription.slice(0, 160),
    focusKeyword: keyword.keyword,
    slug,
    faq: defaultFaq(keyword.keyword, keyword.destination),
    metaKeywords: [
      keyword.keyword,
      keyword.destination ?? "India travel",
      "Safar Sathi",
      keyword.category.replace(/_/g, " "),
    ],
    openGraph: {
      title: seoTitle,
      description: seoDescription.slice(0, 160),
      url: canonicalUrl,
    },
    schemaMarkup: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: seoTitle,
      description: seoDescription.slice(0, 160),
      keywords: keyword.keyword,
      author: { "@type": "Organization", name: "Safar Sathi" },
      publisher: { "@type": "Organization", name: "Safar Sathi" },
      mainEntityOfPage: canonicalUrl,
    },
    canonicalUrl,
    createdAt: new Date().toISOString(),
  };

  try {
    const { content, provider } = await routeCompletion(
      "You are Safar Sathi SEO Agent. Generate SEO meta as JSON with seoTitle, seoDescription, focusKeyword, metaKeywords array, faq array.",
      [{ role: "user", content: JSON.stringify({ keyword: keyword.keyword, destination: keyword.destination, category: keyword.category }) }],
      async () => JSON.stringify(fallback),
      { maxTokens: 600, timeoutMs: 8000 }
    );
    if (provider === "rule-based") return fallback;
    const parsed = JSON.parse(content) as Partial<SeoMetaRecord>;
    return {
      ...fallback,
      seoTitle: parsed.seoTitle ?? fallback.seoTitle,
      seoDescription: (parsed.seoDescription ?? fallback.seoDescription).slice(0, 160),
      focusKeyword: parsed.focusKeyword ?? fallback.focusKeyword,
      metaKeywords: parsed.metaKeywords ?? fallback.metaKeywords,
      faq: parsed.faq?.length ? parsed.faq : fallback.faq,
      openGraph: {
        ...fallback.openGraph,
        title: parsed.seoTitle ?? fallback.seoTitle,
        description: (parsed.seoDescription ?? fallback.seoDescription).slice(0, 160),
      },
    };
  } catch {
    return fallback;
  }
}
