import { demoBlogPosts, demoPackages } from "@/data/demo-data";
import { routeCompletion, type AIProvider } from "../router";
import type { ChatMessage } from "../openai";

const SYSTEM_PROMPT = `You are Safar Sathi AI Marketing Agent. Create engaging blog posts and social media
content for Indian travel audiences. Include hashtags and bilingual snippets where relevant.`;

export interface MarketingAgentInput {
  topic: string;
  contentType: "blog" | "social" | "campaign";
  locale?: "en" | "hi";
  platform?: "instagram" | "facebook" | "twitter" | "linkedin";
}

export interface MarketingContent {
  title: string;
  body: string;
  hashtags: string[];
  callToAction: string;
}

export interface MarketingAgentResult {
  content: MarketingContent;
  provider: AIProvider;
}

function ruleBasedMarketing(input: MarketingAgentInput): MarketingContent {
  const isHi = input.locale === "hi";
  const featured = demoPackages.find((p) => p.featured) ?? demoPackages[0];
  const existingBlog = demoBlogPosts[0];

  if (input.contentType === "blog") {
    return {
      title: isHi ? `${input.topic} — Safar Sathi गाइड` : `${input.topic} — Safar Sathi Guide`,
      body: isHi
        ? `${input.topic} पर हमारी विशेष गाइड। ${featured.title.hi} जैसे पैकेज ₹${featured.price.toLocaleString("en-IN")} से शुरू। भारत की सर्वोत्तम यात्रा युक्तियाँ और गंतव्य।`
        : `Our exclusive guide on ${input.topic}. Packages like ${featured.title.en} start at ₹${featured.price.toLocaleString("en-IN")}. Top travel tips and destinations across India.`,
      hashtags: ["#SafarSathi", "#IncredibleIndia", "#TravelIndia", `#${input.topic.replace(/\s+/g, "")}`],
      callToAction: isHi ? "अभी अपनी यात्रा बुक करें!" : "Book your journey today!",
    };
  }

  if (input.contentType === "social") {
    const platform = input.platform ?? "instagram";
    return {
      title: `${input.topic} on ${platform}`,
      body: isHi
        ? `🌏 ${input.topic}! ${featured.title.hi} — ${featured.durationLabel.hi} | ₹${featured.price.toLocaleString("en-IN")} से 📍 ${featured.cities.join(" → ")}`
        : `🌏 ${input.topic}! ${featured.title.en} — ${featured.durationLabel.en} | From ₹${featured.price.toLocaleString("en-IN")} 📍 ${featured.cities.join(" → ")}`,
      hashtags: ["#SafarSathi", "#Wanderlust", "#TravelGoals", "#ExploreIndia"],
      callToAction: isHi ? "लिंक बायो में 👆" : "Link in bio 👆",
    };
  }

  return {
    title: isHi ? `${input.topic} अभियान` : `${input.topic} Campaign`,
    body: isHi
      ? `सीमित समय ऑफर: ${featured.title.hi} पर 15% छूट। ${existingBlog.title.hi} ब्लॉग पढ़ें और बुक करें।`
      : `Limited-time offer: 15% off ${featured.title.en}. Read our blog "${existingBlog.title.en}" and book now.`,
    hashtags: ["#SafarSathi", "#TravelDeals", "#BookNow"],
    callToAction: isHi ? "ऑफर का लाभ उठाएं" : "Claim your offer",
  };
}

export async function runMarketingAgent(input: MarketingAgentInput): Promise<MarketingAgentResult> {
  const messages: ChatMessage[] = [
    { role: "user", content: JSON.stringify(input) },
  ];

  const fallback = ruleBasedMarketing(input);
  const { content: raw, provider } = await routeCompletion(
    SYSTEM_PROMPT,
    messages,
    () => JSON.stringify(fallback)
  );

  if (provider === "rule-based") {
    return { content: fallback, provider };
  }

  try {
    const parsed = JSON.parse(raw) as MarketingContent;
    return { content: parsed, provider };
  } catch {
    return {
      content: { ...fallback, body: raw },
      provider,
    };
  }
}
