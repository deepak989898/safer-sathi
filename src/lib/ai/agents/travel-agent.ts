import { demoPackages, demoVehicles } from "@/data/demo-data";
import { getPackages, getVehicles } from "@/lib/data-service";
import type { TourPackage, Vehicle } from "@/types";
import { routeCompletion, type AIProvider } from "../router";
import type { ChatMessage } from "../openai";

const SYSTEM_PROMPT = `You are Safar Sathi AI Travel Agent, an expert Indian travel planner.
Help users plan trips, recommend tour packages and vehicles, and provide practical travel advice.
Respond in the user's language (English or Hindi). Be concise and actionable.
When recommending packages, mention price, duration, and key highlights.`;

export interface TravelAgentInput {
  message: string;
  locale?: "en" | "hi";
  history?: ChatMessage[];
}

export interface TravelRecommendation {
  packages: TourPackage[];
  vehicles: Vehicle[];
}

export interface TravelAgentResult {
  reply: string;
  provider: AIProvider;
  recommendations: TravelRecommendation;
}

function ruleBasedTravelReply(
  message: string,
  locale: "en" | "hi",
  packages: TourPackage[],
  vehicles: Vehicle[]
): string {
  const q = message.toLowerCase();
  const isHi = locale === "hi";

  if (q.includes("honeymoon") || q.includes("हनीमून")) {
    const pkg = packages.find((p) => p.category === "honeymoon") ?? packages[0];
    return isHi
      ? `हनीमून के लिए मैं "${pkg.title.hi}" की सिफारिश करता हूं — ${pkg.durationLabel.hi}, ₹${pkg.price.toLocaleString("en-IN")} से शुरू। केरल बैकवाटर्स और हाउसबोट स्टे शामिल है।`
      : `For a honeymoon, I recommend "${pkg.title.en}" — ${pkg.durationLabel.en}, starting at ₹${pkg.price.toLocaleString("en-IN")}. Includes Kerala backwaters and houseboat stay.`;
  }

  if (q.includes("religious") || q.includes("pilgrim") || q.includes("धाम") || q.includes("यात्रा")) {
    const pkg = packages.find((p) => p.category === "religious") ?? packages[0];
    return isHi
      ? `धार्मिक यात्रा के लिए "${pkg.title.hi}" उपयुक्त है — ${pkg.duration} दिन, ₹${pkg.price.toLocaleString("en-IN")}। चार धाम दर्शन शामिल।`
      : `For a pilgrimage, "${pkg.title.en}" is ideal — ${pkg.duration} days, ₹${pkg.price.toLocaleString("en-IN")}. Covers Char Dham darshan.`;
  }

  if (q.includes("vehicle") || q.includes("car") || q.includes("suv") || q.includes("वाहन")) {
    const top = vehicles.slice(0, 2);
    return isHi
      ? `आपके लिए उपलब्ध वाहन: ${top.map((v) => `${v.name.hi} (₹${v.pricePerDay}/दिन)`).join(", ")}।`
      : `Available vehicles for you: ${top.map((v) => `${v.name.en} (₹${v.pricePerDay}/day)`).join(", ")}.`;
  }

  const featured = packages.filter((p) => p.featured).slice(0, 2);
  return isHi
    ? `नमस्ते! Safar Sathi में आपका स्वागत है। मैं आपकी यात्रा योजना में मदद कर सकता हूं। लोकप्रिय पैकेज: ${featured.map((p) => p.title.hi).join(", ")}। बजट और गंतव्य बताएं।`
    : `Welcome to Safar Sathi! I can help plan your trip. Popular packages: ${featured.map((p) => p.title.en).join(", ")}. Tell me your budget and destination preferences.`;
}

function getRecommendations(message: string): TravelRecommendation {
  const q = message.toLowerCase();
  let packages = [...demoPackages];
  let vehicles = [...demoVehicles];

  if (q.includes("honeymoon")) {
    packages = packages.filter((p) => p.category === "honeymoon");
  } else if (q.includes("adventure") || q.includes("trek")) {
    packages = packages.filter((p) => p.category === "adventure");
  } else if (q.includes("religious") || q.includes("pilgrim") || q.includes("dharam")) {
    packages = packages.filter((p) => p.category === "religious");
  } else if (q.includes("vehicle") || q.includes("car") || q.includes("suv")) {
    packages = [];
    vehicles = vehicles.filter((v) => v.type === "suv" || v.type === "car");
  }

  return {
    packages: packages.slice(0, 3),
    vehicles: vehicles.slice(0, 3),
  };
}

export async function runTravelAgent(input: TravelAgentInput): Promise<TravelAgentResult> {
  const locale = input.locale ?? "en";
  const [packages, vehicles] = await Promise.all([getPackages(), getVehicles()]);
  const recommendations = getRecommendations(input.message);

  const contextNote = `Available packages: ${packages.map((p) => `${p.title.en} (₹${p.price})`).join("; ")}. Vehicles: ${vehicles.map((v) => `${v.name.en} (₹${v.pricePerDay}/day)`).join("; ")}.`;

  const messages: ChatMessage[] = [
    ...(input.history ?? []),
    { role: "user", content: `${input.message}\n\n[Context: ${contextNote}]` },
  ];

  const { content, provider } = await routeCompletion(
    SYSTEM_PROMPT,
    messages,
    () => ruleBasedTravelReply(input.message, locale, packages, vehicles)
  );

  return { reply: content, provider, recommendations };
}
