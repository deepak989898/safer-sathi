import type { Locale } from "@/types";
import type {
  AITravelPreferences,
  IndiaRegion,
  QuickReply,
  UserLocationInfo,
} from "@/types/travel-manager";

export type { AITravelPreferences, IndiaRegion, UserLocationInfo };

export const NORTH_INDIA_STATES = [
  "uttar pradesh",
  "delhi",
  "rajasthan",
  "madhya pradesh",
  "bihar",
  "haryana",
  "punjab",
  "uttarakhand",
  "himachal pradesh",
  "jharkhand",
  "chandigarh",
  "jammu and kashmir",
  "ladakh",
];

export const SOUTH_INDIA_STATES = [
  "tamil nadu",
  "kerala",
  "karnataka",
  "andhra pradesh",
  "telangana",
  "puducherry",
];

const CITY_SUGGESTIONS: Record<string, { en: string[]; hi: string[] }> = {
  delhi: {
    en: ["Manali", "Shimla", "Rishikesh", "Jaipur", "Kashmir"],
    hi: ["मनाली", "शिमला", "ऋषिकेश", "जयपुर", "कश्मीर"],
  },
  "new delhi": {
    en: ["Manali", "Shimla", "Rishikesh", "Jaipur", "Kashmir"],
    hi: ["मनाली", "शिमला", "ऋषिकेश", "जयपुर", "कश्मीर"],
  },
  lucknow: {
    en: ["Manali", "Shimla", "Rishikesh", "Jaipur", "Kashmir"],
    hi: ["मनाली", "शिमला", "ऋषिकेश", "जयपुर", "कश्मीर"],
  },
  mumbai: {
    en: ["Goa", "Udaipur", "Kerala", "Andaman"],
    hi: ["गोवा", "उदयपुर", "केरल", "अंडमान"],
  },
  bangalore: {
    en: ["Ooty", "Coorg", "Munnar", "Kodaikanal"],
    hi: ["ऊटी", "कोर्ग", "मुन्नार", "कोडैकनाल"],
  },
  bengaluru: {
    en: ["Ooty", "Coorg", "Munnar", "Kodaikanal"],
    hi: ["ऊटी", "कोर्ग", "मुन्नार", "कोडैकनाल"],
  },
};

const DESTINATION_VALUES: Record<string, string> = {
  Manali: "Manali",
  मनाली: "Manali",
  Shimla: "Shimla",
  शिमला: "Shimla",
  Rishikesh: "Rishikesh",
  ऋषिकेश: "Rishikesh",
  Jaipur: "Jaipur",
  जयपुर: "Jaipur",
  Kashmir: "Kashmir",
  कश्मीर: "Kashmir",
  Goa: "Goa",
  गोवा: "Goa",
  Udaipur: "Udaipur",
  उदयपुर: "Udaipur",
  Kerala: "Kerala",
  केरल: "Kerala",
  Andaman: "Andaman",
  अंडमान: "Andaman",
  Ooty: "Ooty",
  ऊटी: "Ooty",
  Coorg: "Coorg",
  कोर्ग: "Coorg",
  Munnar: "Munnar",
  मुन्नार: "Munnar",
  Kodaikanal: "Kodaikanal",
  कोडैकनाल: "Kodaikanal",
};

export function normalizeState(state?: string): string {
  return (state ?? "").trim().toLowerCase();
}

export function detectIndiaRegion(state?: string, city?: string): IndiaRegion {
  const s = normalizeState(state);
  const c = (city ?? "").trim().toLowerCase();

  if (NORTH_INDIA_STATES.some((n) => s.includes(n) || n.includes(s))) return "north";
  if (SOUTH_INDIA_STATES.some((n) => s.includes(n) || n.includes(s))) return "south";

  if (["delhi", "lucknow", "jaipur", "chandigarh", "dehradun", "shimla"].some((x) => c.includes(x))) {
    return "north";
  }
  if (["mumbai", "pune", "bangalore", "bengaluru", "chennai", "hyderabad", "kochi"].some((x) => c.includes(x))) {
    return "south";
  }
  return "other";
}

export function preferredLanguageToLocale(lang?: "hindi" | "english"): Locale {
  return lang === "hindi" ? "hi" : "en";
}

export function localeToPreferredLanguage(locale: Locale): "hindi" | "english" {
  return locale === "hi" ? "hindi" : "english";
}

export interface ResolveLocaleInput {
  savedPreference?: "hindi" | "english" | null;
  browserLanguage?: string;
  location?: UserLocationInfo;
}

export function hasDetectedCity(location?: UserLocationInfo): boolean {
  const city = (location?.city ?? "").trim();
  return city.length > 0;
}

/** Priority: saved > browser > IP region > Hindi if no city > English (south only) */
export function resolveAiLocale(input: ResolveLocaleInput): Locale {
  if (input.savedPreference === "hindi") return "hi";
  if (input.savedPreference === "english") return "en";

  const browser = (input.browserLanguage ?? "").toLowerCase();
  if (browser.startsWith("hi")) return "hi";

  if (!hasDetectedCity(input.location)) return "hi";

  const region =
    input.location?.region ?? detectIndiaRegion(input.location?.state, input.location?.city);
  if (region === "north") return "hi";
  if (region === "south") return "en";

  return "hi";
}

export function getLocationSuggestions(
  location: UserLocationInfo | undefined,
  locale: Locale
): QuickReply[] {
  const city = (location?.city ?? "").trim().toLowerCase();
  const key = Object.keys(CITY_SUGGESTIONS).find((k) => city.includes(k) || k.includes(city));
  const bucket = key ? CITY_SUGGESTIONS[key] : null;
  const labels = bucket ? (locale === "hi" ? bucket.hi : bucket.en) : null;

  if (labels) {
    const replies = labels.map((label, i) => ({
      id: `loc-${i}`,
      label: locale === "hi" ? addEmoji(label) : label,
      value: DESTINATION_VALUES[label] ?? label,
    }));
    replies.push(
      locale === "hi"
        ? { id: "dest-custom", label: "🎒 कस्टम ट्रिप", value: "Custom" }
        : { id: "dest-custom", label: "🎒 Custom Trip", value: "Custom" }
    );
    return replies;
  }

  return locale === "hi" ? defaultWelcomeRepliesHi() : defaultWelcomeRepliesEn();
}

function addEmoji(label: string): string {
  const map: Record<string, string> = {
    मनाली: "🏔 मनाली",
    Manali: "🏔 Manali",
    गोवा: "🌴 गोवा",
    Goa: "🌴 Goa",
    कश्मीर: "🏔 कश्मीर",
    Kashmir: "🏔 Kashmir",
    केरल: "🌿 केरल",
    Kerala: "🌿 Kerala",
    शिमला: "🏔 शिमला",
    Shimla: "🏔 Shimla",
  };
  return map[label] ?? label;
}

export function defaultWelcomeRepliesEn(): QuickReply[] {
  return [
    { id: "dest-manali", label: "🏔 Manali", value: "Manali" },
    { id: "dest-goa", label: "🌴 Goa", value: "Goa" },
    { id: "dest-kashmir", label: "🏔 Kashmir", value: "Kashmir" },
    { id: "dest-kerala", label: "🌿 Kerala", value: "Kerala" },
    { id: "dest-gt", label: "🕌 Golden Triangle", value: "Golden Triangle" },
    { id: "dest-intl", label: "✈ International", value: "International" },
    { id: "dest-custom", label: "🎒 Custom Trip", value: "Custom" },
  ];
}

export function defaultWelcomeRepliesHi(): QuickReply[] {
  return [
    { id: "dest-manali", label: "🏔 मनाली", value: "Manali" },
    { id: "dest-goa", label: "🌴 गोवा", value: "Goa" },
    { id: "dest-kashmir", label: "🏔 कश्मीर", value: "Kashmir" },
    { id: "dest-kerala", label: "🌿 केरल", value: "Kerala" },
    { id: "dest-gt", label: "🕌 गोल्डन ट्राएंगल", value: "Golden Triangle" },
    { id: "dest-intl", label: "✈ विदेश यात्रा", value: "International" },
    { id: "dest-custom", label: "🎒 कस्टम ट्रिप", value: "Custom" },
  ];
}

export function getSmartGreeting(location: UserLocationInfo | undefined, locale: Locale): string {
  const city = (location?.city ?? "").toLowerCase();

  if (locale === "hi") {
    if (city.includes("delhi") || city.includes("lucknow") || location?.region === "north") {
      return "🙏 नमस्ते!\n\nमैं Safar Sathi AI Travel Manager हूँ।\n\nदिल्ली और उत्तर भारत से मनाली, शिमला और कश्मीर के लिए शानदार पैकेज उपलब्ध हैं।\n\nमैं आपकी यात्रा की पूरी योजना बनाने में मदद कर सकता हूँ।\n\nआप कहाँ घूमना चाहते हैं?";
    }
    return "🙏 नमस्ते!\n\nमैं Safar Sathi AI Travel Manager हूँ।\n\nमैं आपकी यात्रा की पूरी योजना बनाने में मदद कर सकता हूँ।\n\nआप कहाँ घूमना चाहते हैं?";
  }

  if (city.includes("mumbai") || city.includes("pune")) {
    return "Hello 👋\n\nI am Safar Sathi AI Travel Manager.\n\nLooking for beach vacations? Goa and Kerala are perfect choices from Mumbai.\n\nWhere would you like to travel?";
  }
  if (city.includes("bangalore") || city.includes("bengaluru") || location?.region === "south") {
    return "Hello 👋\n\nI am Safar Sathi AI Travel Manager.\n\nFrom Bangalore, hill stations like Ooty, Coorg and Munnar are popular getaways.\n\nWhere would you like to travel?";
  }
  if (city.includes("delhi")) {
    return "Hello 👋\n\nI am Safar Sathi AI Travel Manager.\n\nFrom Delhi, we have excellent packages to Manali, Shimla and Kashmir.\n\nWhere would you like to travel?";
  }

  return "Hello 👋\n\nI am Safar Sathi AI Travel Manager.\n\nI can help you plan your journey.\n\nWhere would you like to travel?";
}

export function mergePreferences(
  existing: AITravelPreferences | undefined,
  updates: Partial<AITravelPreferences>
): AITravelPreferences {
  const favs = new Set([...(existing?.favouriteDestinations ?? []), ...(updates.favouriteDestinations ?? [])]);
  return {
    preferredLanguage: updates.preferredLanguage ?? existing?.preferredLanguage ?? "english",
    preferredBudget: updates.preferredBudget ?? existing?.preferredBudget,
    tripStyle: updates.tripStyle ?? existing?.tripStyle,
    hotelCategory: updates.hotelCategory ?? existing?.hotelCategory,
    vehiclePreference: updates.vehiclePreference ?? existing?.vehiclePreference,
    lastCity: updates.lastCity ?? existing?.lastCity,
    lastState: updates.lastState ?? existing?.lastState,
    lastCountry: updates.lastCountry ?? existing?.lastCountry,
    favouriteDestinations: [...favs].slice(-10),
    updatedAt: new Date().toISOString(),
  };
}

export function memoryFromState(
  state: {
    destination?: string;
    tripType?: string;
    budget?: number;
    hotelBudgetTier?: string;
    selectedVehicleId?: string;
  },
  locale: Locale
): Partial<AITravelPreferences> {
  const updates: Partial<AITravelPreferences> = {
    preferredLanguage: localeToPreferredLanguage(locale),
  };
  if (state.budget) updates.preferredBudget = state.budget;
  if (state.tripType) updates.tripStyle = state.tripType;
  if (state.destination) updates.favouriteDestinations = [state.destination];
  if (state.hotelBudgetTier) updates.hotelCategory = state.hotelBudgetTier;
  if (state.selectedVehicleId) updates.vehiclePreference = state.selectedVehicleId;
  return updates;
}
