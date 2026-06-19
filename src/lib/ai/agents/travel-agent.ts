import { getBookings, getPackages, getVehicles } from "@/lib/data-service";
import type { TourPackage, Vehicle } from "@/types";
import { routeCompletion, type AIProvider } from "../router";
import type { ChatMessage } from "../openai";

const SYSTEM_PROMPT_EN = `You are Safar Sathi AI Travel Agent, an expert Indian travel planner.
Help users plan trips, recommend tour packages, vehicles, and hotels, and answer travel enquiries.
Respond in clear English. Be concise, warm, and actionable.
When recommending packages, mention price, duration, and key highlights.`;

const SYSTEM_PROMPT_HI = `आप Safar Sathi AI यात्रा सहायक हैं — भारत के विशेषज्ञ यात्रा योजनाकार।
उपयोगकर्ता हिंदी या हिंग्लिश में अपनी पूछताछ कर सकता है। आपको हमेशा पूरी तरह हिंदी (देवनागरी) में जवाब देना है।
यात्रा योजना, टूर पैकेज, वाहन, होटल और बजट के बारे में सहायता करें। संक्षिप्त, स्पष्ट और उपयोगी जवाब दें।
पैकेज सुझाते समय कीमत, अवधि और मुख्य आकर्षण बताएं।`;

function getSystemPrompt(locale: "en" | "hi"): string {
  return locale === "hi" ? SYSTEM_PROMPT_HI : SYSTEM_PROMPT_EN;
}

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

function getRecommendations(
  message: string,
  packages: TourPackage[],
  vehicles: Vehicle[]
): TravelRecommendation {
  const q = message.toLowerCase();
  let filteredPackages = [...packages];
  let filteredVehicles = [...vehicles];

  if (q.includes("honeymoon")) {
    filteredPackages = filteredPackages.filter((p) => p.category === "honeymoon");
  } else if (q.includes("adventure") || q.includes("trek")) {
    filteredPackages = filteredPackages.filter((p) => p.category === "adventure");
  } else if (q.includes("religious") || q.includes("pilgrim") || q.includes("dharam")) {
    filteredPackages = filteredPackages.filter((p) => p.category === "religious");
  } else if (q.includes("vehicle") || q.includes("car") || q.includes("suv")) {
    filteredPackages = [];
    filteredVehicles = filteredVehicles.filter((v) => v.type === "suv" || v.type === "car");
  }

  return {
    packages: filteredPackages.slice(0, 3),
    vehicles: filteredVehicles.slice(0, 3),
  };
}

export async function runTravelAgent(input: TravelAgentInput): Promise<TravelAgentResult> {
  const locale = input.locale ?? "en";
  const [packages, vehicles] = await Promise.all([getPackages(), getVehicles()]);
  const recommendations = getRecommendations(input.message, packages, vehicles);

  const contextNote =
    locale === "hi"
      ? `उपलब्ध पैकेज: ${packages.map((p) => `${p.title.hi} (₹${p.price})`).join("; ")}। वाहन: ${vehicles.map((v) => `${v.name.hi} (₹${v.pricePerDay}/दिन)`).join("; ")}।`
      : `Available packages: ${packages.map((p) => `${p.title.en} (₹${p.price})`).join("; ")}. Vehicles: ${vehicles.map((v) => `${v.name.en} (₹${v.pricePerDay}/day)`).join("; ")}.`;

  const userContent =
    locale === "hi"
      ? `${input.message}\n\n[संदर्भ: ${contextNote}\nउत्तर केवल हिंदी में दें।]`
      : `${input.message}\n\n[Context: ${contextNote}]`;

  const messages: ChatMessage[] = [
    ...(input.history ?? []),
    { role: "user", content: userContent },
  ];

  const { content, provider } = await routeCompletion(
    getSystemPrompt(locale),
    messages,
    () => ruleBasedTravelReply(input.message, locale, packages, vehicles)
  );

  return { reply: content, provider, recommendations };
}
