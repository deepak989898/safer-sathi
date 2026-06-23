import { routeCompletion } from "@/lib/ai/router";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import type {
  AiBlogPost,
  AiCenterSettings,
  BlogImagePrompt,
  KeywordCategory,
  SeoKeyword,
  SeoMetaRecord,
} from "@/lib/ai-center/types";
import {
  buildDistanceSection,
  formatReferencesMarkdown,
  getDestinationBlogReference,
  resolveDestinationName,
} from "@/lib/ai-center/blog-reference-data";
import { estimateWordCount, slugify } from "@/lib/ai-center/utils";

const IMAGE_POOL = [
  HERO_IMAGES.packages,
  HERO_IMAGES.hotels,
  HERO_IMAGES.vehicles,
  HERO_IMAGES.blog,
  HERO_IMAGES.assistant,
];

const SYSTEM_PROMPT = `You are an expert Indian travel content writer for Safar Sathi.
Write helpful, factual SEO blog posts in clean Markdown.

STRICT RULES:
- Use each H2 heading (##) ONLY ONCE — never repeat a section title
- NEVER create filler sections like "More About [place]" or duplicate conclusions
- Mention "Safar Sathi" at most twice (introduction + one soft CTA in conclusion)
- Write for travellers, not sales copy — specific names, distances, months, prices
- Include practical details: how to reach, best time, real attractions, local food
- End with "## Sources & Further Reading" using the provided reference links as markdown links
- Target the requested word count naturally without padding or repetition
- Use bullet lists and short paragraphs for readability`;

function buildImagePrompts(keyword: string, destination?: string): BlogImagePrompt[] {
  const dest = destination ?? "India";
  return [
    {
      id: "hero",
      label: "Destination Hero",
      prompt: `Wide cinematic hero banner of ${dest}, golden hour, travel photography, no text`,
      url: IMAGE_POOL[0],
    },
    {
      id: "places",
      label: "Top Places",
      prompt: `Collage of famous landmarks and scenic spots in ${dest}, vibrant, editorial style`,
      url: IMAGE_POOL[1],
    },
    {
      id: "activities",
      label: "Adventure Activities",
      prompt: `Adventure activities in ${dest}: trekking, rafting, paragliding, action travel photo`,
      url: IMAGE_POOL[2],
    },
    {
      id: "hotels",
      label: "Hotels & Stays",
      prompt: `Luxury and budget hotels in ${dest}, mountain or beach resort, warm lighting`,
      url: IMAGE_POOL[3],
    },
    {
      id: "banner",
      label: "Travel Banner",
      prompt: `Professional travel banner for ${keyword}, Indian landscape, editorial`,
      url: IMAGE_POOL[4],
    },
  ];
}

/** Remove duplicate ## sections (keeps first occurrence). */
export function dedupeMarkdownSections(markdown: string): string {
  const chunks = markdown.split(/(?=^##\s)/m);
  const seen = new Set<string>();
  const kept: string[] = [];

  for (const chunk of chunks) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^##\s+(.+?)(?:\n|$)/);
    if (!match) {
      kept.push(chunk);
      continue;
    }
    const key = match[1].toLowerCase().replace(/\s+/g, " ").trim();
    if (key.startsWith("more about")) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(chunk.endsWith("\n") ? chunk : `${chunk}\n`);
  }

  return kept.join("").trim();
}

function buildReferenceContext(keyword: string, destination?: string): string {
  const ref = getDestinationBlogReference(keyword, destination);
  const dest = resolveDestinationName(keyword, destination);
  const links = ref.references.map((r) => `- ${r.title}: ${r.url}`).join("\n");

  return `DESTINATION: ${dest} (${ref.state})
BEST TIME: ${ref.bestTime}
HOW TO REACH: ${ref.howToReach}
LOCAL FOOD: ${ref.localFood}
TOP ATTRACTIONS: ${ref.attractions.join("; ")}
ACTIVITIES: ${ref.activities.join("; ")}
TYPICAL BUDGET: ${ref.avgBudgetPerDay}
TRAVEL TIPS: ${ref.travelTips.join("; ")}
REFERENCE LINKS (use in Sources section):
${links}`;
}

function buildSections(
  keyword: string,
  destination: string | undefined,
  wordLimit: number
): string {
  const ref = getDestinationBlogReference(keyword, destination);
  const dest = resolveDestinationName(keyword, destination);
  const distanceBlock = buildDistanceSection(keyword);

  const sections: string[] = [
    `# ${keyword}`,
    `## Introduction\n\nPlanning **${keyword}**? ${dest} in ${ref.state} rewards travellers with distinct seasons, local cuisine, and well-known sights. This guide covers practical timing, routes, places to see, and budget — so you can plan confidently before you book.`,
    distanceBlock ?? "",
    `## Best Time To Visit\n\n${ref.bestTime}`,
    `## How To Reach\n\n${ref.howToReach}`,
    `## Top Attractions\n\n${ref.attractions.map((a) => `- ${a}`).join("\n")}`,
    `## Things To Do\n\n${ref.activities.map((a) => `- ${a}`).join("\n")}`,
    `## Local Food & Culture\n\n${ref.localFood}`,
    `## Where To Stay\n\n${dest} has hostels, mid-range hotels, and boutique stays. Old-town or central areas save daily travel time; book early for Christmas–New Year, Diwali, and summer weekends. Compare star rating, breakfast inclusion, and parking before paying.`,
    `## Budget & Trip Cost\n\nTypical spend: **${ref.avgBudgetPerDay}** (excluding flights). Couples and families can lower cost with off-season dates, weekday stays, and shared cabs for sightseeing.`,
    `## Travel Tips\n\n${ref.travelTips.map((t) => `- ${t}`).join("\n")}`,
    `## FAQ\n\n**How many days are enough for ${dest}?**\nMost first-time visitors plan 3–5 nights to cover main sights without rushing.\n\n**Is ${dest} safe for solo travellers?**\nStick to registered operators, share itinerary with family, and avoid isolated areas at night.\n\n**Can I book packages online?**\nYes — compare hotel, cab, and itinerary inclusions before payment.`,
    `## Conclusion\n\n${dest} works well for families, couples, and adventure groups when you match season to activities. Use the tips above to plan dates and routes — Safar Sathi can help you compare live packages when you are ready to book.`,
    formatReferencesMarkdown(ref.references),
  ].filter(Boolean);

  let content = dedupeMarkdownSections(sections.join("\n\n"));
  const words = estimateWordCount(content);
  if (words > wordLimit * 1.15) {
    content = content.split(/\s+/).slice(0, wordLimit).join(" ");
  }
  return content;
}

function buildUserPrompt(
  keyword: SeoKeyword,
  wordLimit: number,
  referenceContext: string
): string {
  return `Write a ${wordLimit}-word Markdown blog for this SEO keyword.

KEYWORD: ${keyword.keyword}
CATEGORY: ${keyword.category}
DESTINATION HINT: ${keyword.destination ?? "infer from keyword"}

REFERENCE DATA (use facts; do not invent contradictory details):
${referenceContext}

STRUCTURE (each ## heading once only):
1. Introduction
2. Best Time To Visit
3. How To Reach
4. Top Attractions (specific bullets)
5. Things To Do
6. Local Food & Culture
7. Where To Stay
8. Budget & Trip Cost
9. Travel Tips
10. FAQ (3 questions)
11. Conclusion (one brief Safar Sathi mention max)
12. Sources & Further Reading (markdown links from references)

If the keyword mentions distance between two cities, add a "Distance & Route Overview" section with km, hours, and transport table near the top.`;
}

export interface GenerateBlogInput {
  keyword: SeoKeyword;
  seoMeta?: SeoMetaRecord;
  settings: AiCenterSettings;
  titleOverride?: string;
  contentOverride?: string;
}

export async function generateBlogPost(input: GenerateBlogInput): Promise<AiBlogPost> {
  const { keyword, seoMeta, settings } = input;
  const now = new Date().toISOString();
  const slug = seoMeta?.slug ?? slugify(keyword.keyword);
  const title = input.titleOverride ?? seoMeta?.seoTitle ?? keyword.keyword;
  const dest = resolveDestinationName(keyword.keyword, keyword.destination);
  const referenceContext = buildReferenceContext(keyword.keyword, keyword.destination);

  let content =
    input.contentOverride ??
    buildSections(keyword.keyword, keyword.destination, settings.blogWordLimit);

  try {
    const { content: aiContent, provider } = await routeCompletion(
      SYSTEM_PROMPT,
      [
        {
          role: "user",
          content: buildUserPrompt(keyword, settings.blogWordLimit, referenceContext),
        },
      ],
      async () => content,
      { maxTokens: 4000, timeoutMs: 25_000 }
    );
    if (provider !== "rule-based" && aiContent.length > 400) {
      content = dedupeMarkdownSections(aiContent);
      if (!content.toLowerCase().includes("sources & further reading")) {
        const ref = getDestinationBlogReference(keyword.keyword, keyword.destination);
        content += `\n\n${formatReferencesMarkdown(ref.references)}`;
      }
    }
  } catch {
    // keep rule-based content
  }

  content = dedupeMarkdownSections(content);
  const wordCount = estimateWordCount(content);
  const faq = seoMeta?.faq ?? [
    {
      question: `What is the best time for ${dest}?`,
      answer: getDestinationBlogReference(keyword.keyword, keyword.destination).bestTime.slice(0, 200),
    },
    {
      question: `How do I reach ${dest}?`,
      answer: getDestinationBlogReference(keyword.keyword, keyword.destination).howToReach.slice(0, 200),
    },
  ];

  const plainExcerpt = content
    .replace(/^#.+$/gm, "")
    .replace(/^##.+$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return {
    id: `blog_${slug}_${Date.now()}`,
    title,
    slug,
    keyword: keyword.keyword,
    keywordId: keyword.id,
    category: keyword.category as KeywordCategory,
    destination: dest,
    metaTitle: seoMeta?.seoTitle ?? title,
    metaDescription: seoMeta?.seoDescription ?? plainExcerpt.slice(0, 155),
    excerpt: plainExcerpt.slice(0, 220).trim() + (plainExcerpt.length > 220 ? "…" : ""),
    content,
    featuredImage: buildImagePrompts(keyword.keyword, dest)[0].url,
    imagePrompts: buildImagePrompts(keyword.keyword, dest),
    faq,
    wordCount,
    status: settings.autoDraftEnabled ? "pending_approval" : "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export async function regenerateBlogContent(
  blog: AiBlogPost,
  settings: AiCenterSettings
): Promise<AiBlogPost> {
  const keyword: SeoKeyword = {
    id: blog.keywordId ?? blog.id,
    keyword: blog.keyword,
    searchVolume: 1000,
    competition: "medium",
    trendScore: 50,
    category: blog.category,
    destination: blog.destination,
    seoScore: 60,
    status: "approved",
    createdAt: blog.createdAt,
  };

  const fresh = await generateBlogPost({
    keyword,
    settings,
    titleOverride: blog.title,
  });

  return {
    ...blog,
    content: fresh.content,
    wordCount: fresh.wordCount,
    excerpt: fresh.excerpt,
    metaDescription: fresh.metaDescription,
    destination: fresh.destination,
    updatedAt: new Date().toISOString(),
  };
}
