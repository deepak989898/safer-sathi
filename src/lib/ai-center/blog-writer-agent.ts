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
import { estimateWordCount, slugify } from "@/lib/ai-center/utils";

const IMAGE_POOL = [
  HERO_IMAGES.packages,
  HERO_IMAGES.hotels,
  HERO_IMAGES.vehicles,
  HERO_IMAGES.blog,
  HERO_IMAGES.assistant,
];

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
      prompt: `Safar Sathi style travel banner for ${keyword}, bus and mountains, professional`,
      url: IMAGE_POOL[4],
    },
  ];
}

function buildSections(keyword: string, destination?: string, wordLimit = 1500): string {
  const dest = destination ?? "India";
  const sections = [
    `# ${keyword}\n\nDiscover everything you need to plan an unforgettable trip with Safar Sathi — India's trusted travel partner for live-priced packages, hotels, and vehicles.`,
    `## Introduction\n\n${keyword} is one of the most searched travel topics for Indian travellers. Whether you are planning a family vacation, honeymoon, or adventure trip to ${dest}, Safar Sathi helps you compare live prices and book instantly.`,
    `## Best Time To Visit\n\nThe best time to visit ${dest} depends on your travel style. October to March is ideal for most hill stations and heritage cities. Summer months suit high-altitude escapes, while monsoon lovers enjoy lush greenery in Kerala and Goa.`,
    `## Top Attractions\n\nExplore iconic landmarks, local markets, viewpoints, and cultural sites. Popular highlights include scenic valleys, heritage forts, lakes, beaches, and adventure hubs. Safar Sathi packages include curated sightseeing with professional drivers.`,
    `## Hotels & Where To Stay\n\nFrom budget guesthouses to 5-star resorts, ${dest} offers stays for every budget. Safar Sathi shows live hotel prices with star ratings, amenities, and room types — book directly with instant confirmation.`,
    `## Adventure Activities\n\nAdventure seekers can enjoy trekking, river rafting, paragliding, camping, jeep safaris, and snow activities depending on the season. Our AI Travel Assistant can customize activities in your package tier.`,
    `## Budget & Package Options\n\nSafar Sathi offers Budget, Standard, Premium, and Luxury tiers with live Firebase pricing. Typical packages include hotel, vehicle, meals, and sightseeing. No hidden charges — pay securely via Razorpay.`,
    `## Travel Tips\n\n- Book early during peak season (Diwali, New Year, summer holidays)\n- Carry valid ID for hotel check-in\n- Confirm pickup city and travel dates in advance\n- Use Safar Sathi AI Assistant for Hindi/English trip planning\n- Compare 4 live package tiers before booking`,
    `## FAQ\n\n**How do I book ${keyword}?**\nUse Safar Sathi website or AI Travel Assistant to select destination, duration, and package tier.\n\n**Are prices live?**\nYes — hotel and vehicle prices are fetched live from our catalog.`,
    `## Conclusion\n\nReady to explore ${dest}? Browse Safar Sathi tour packages, hotels, and vehicles — or chat with our AI Travel Assistant for a personalized itinerary. Travel | Comfort | Trust.`,
  ];

  let content = sections.join("\n\n");
  while (estimateWordCount(content) < wordLimit * 0.85) {
    content += `\n\n## More About ${dest}\n\n${dest} continues to be a favourite among Indian travellers for its unique culture, cuisine, and landscapes. Safar Sathi curates itineraries with local expertise and transparent pricing.`;
  }
  return content.slice(0, wordLimit * 6);
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
  let content = input.contentOverride ?? buildSections(keyword.keyword, keyword.destination, settings.blogWordLimit);

  try {
    const { content: aiContent, provider } = await routeCompletion(
      `You are Safar Sathi AI Blog Writer. Write a ${settings.blogWordLimit}-word SEO travel blog in markdown with sections: Introduction, Best Time, Top Attractions, Hotels, Adventure, Budget, Travel Tips, FAQ, Conclusion. Indian travel focus.`,
      [
        {
          role: "user",
          content: `Keyword: ${keyword.keyword}\nDestination: ${keyword.destination ?? "India"}\nCategory: ${keyword.category}`,
        },
      ],
      async () => content,
      { maxTokens: 2500, timeoutMs: 12000 }
    );
    if (provider !== "rule-based" && aiContent.length > 400) {
      content = aiContent;
    }
  } catch {
    // keep rule-based content
  }

  const wordCount = estimateWordCount(content);
  const faq = seoMeta?.faq ?? [
    { question: `What is ${keyword.keyword}?`, answer: `A complete travel guide for ${keyword.destination ?? "India"} by Safar Sathi.` },
  ];

  return {
    id: `blog_${slug}_${Date.now()}`,
    title,
    slug,
    keyword: keyword.keyword,
    keywordId: keyword.id,
    category: keyword.category as KeywordCategory,
    destination: keyword.destination,
    metaTitle: seoMeta?.seoTitle ?? title,
    metaDescription: seoMeta?.seoDescription ?? content.slice(0, 155),
    excerpt: content.replace(/^#.+$/m, "").slice(0, 220).trim() + "...",
    content,
    featuredImage: buildImagePrompts(keyword.keyword, keyword.destination)[0].url,
    imagePrompts: buildImagePrompts(keyword.keyword, keyword.destination),
    faq,
    wordCount,
    status: settings.autoDraftEnabled ? "pending_approval" : "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function regenerateBlogContent(
  blog: AiBlogPost,
  wordLimit: AiCenterSettings["blogWordLimit"]
): AiBlogPost {
  const content = buildSections(blog.keyword, blog.destination, wordLimit);
  return {
    ...blog,
    content,
    wordCount: estimateWordCount(content),
    excerpt: content.slice(0, 220).trim() + "...",
    updatedAt: new Date().toISOString(),
  };
}
