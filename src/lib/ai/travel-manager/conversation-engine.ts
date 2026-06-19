import {
  getLocationSuggestions,
  getSmartGreeting,
  type AITravelPreferences,
  type UserLocationInfo,
} from "@/lib/ai/travel-manager/geo-language";
import type { Locale } from "@/types";
import type {
  QuickReply,
  TravelManagerResponse,
  TravelManagerState,
  TravelManagerStep,
} from "@/types/travel-manager";

const DESTINATIONS: Record<string, string> = {
  manali: "Manali",
  goa: "Goa",
  kashmir: "Kashmir",
  kerala: "Kerala",
  "golden triangle": "Golden Triangle",
  international: "International",
  custom: "Custom",
  delhi: "Delhi",
  jaipur: "Jaipur",
  agra: "Agra",
  shimla: "Shimla",
  udaipur: "Udaipur",
  rishikesh: "Rishikesh",
  ooty: "Ooty",
  coorg: "Coorg",
  munnar: "Munnar",
  kodaikanal: "Kodaikanal",
  andaman: "Andaman",
};

const TRIP_TYPES = [
  { id: "honeymoon", label: "❤️ Honeymoon", labelHi: "❤️ हनीमून" },
  { id: "family", label: "👨‍👩‍👧 Family", labelHi: "👨‍👩‍👧 परिवार" },
  { id: "adventure", label: "🏍 Adventure", labelHi: "🏍 एडवेंचर" },
  { id: "yoga", label: "🧘 Yoga", labelHi: "🧘 योग" },
  { id: "budget", label: "💰 Budget", labelHi: "💰 बजट" },
  { id: "luxury", label: "⭐ Luxury", labelHi: "⭐ लक्ज़री" },
  { id: "friends", label: "👬 Friends", labelHi: "👬 दोस्त" },
];

const MANALI_ACTIVITIES = [
  "Paragliding",
  "River Rafting",
  "Camping",
  "Trekking",
  "Skiing",
  "Mountain Biking",
  "Jeep Safari",
];

function t(en: string, hi: string, locale: Locale) {
  return locale === "hi" ? hi : en;
}

function welcomeReplies(locale: Locale, location?: UserLocationInfo): QuickReply[] {
  return getLocationSuggestions(location, locale);
}

function parseDestination(text: string): string | null {
  const q = text.toLowerCase();
  for (const [key, val] of Object.entries(DESTINATIONS)) {
    if (q.includes(key)) return val;
  }
  if (/manali|मनाली/.test(q)) return "Manali";
  if (/goa|गोवा/.test(q)) return "Goa";
  if (/kashmir|कश्मीर/.test(q)) return "Kashmir";
  if (/kerala|केरल/.test(q)) return "Kerala";
  if (/shimla|शिमला/.test(q)) return "Shimla";
  if (/rishikesh|ऋषिकेश/.test(q)) return "Rishikesh";
  if (/ooty|ऊटी/.test(q)) return "Ooty";
  if (/coorg|कोर्ग/.test(q)) return "Coorg";
  if (/munnar|मुन्नार/.test(q)) return "Munnar";
  if (/andaman|अंडमान/.test(q)) return "Andaman";
  if (/udaipur|उदयपुर/.test(q)) return "Udaipur";
  return null;
}

function parseIntent(text: string, parsedDest?: string | null): "hotel_only" | "vehicle_only" | "custom_package" | null {
  const q = text.toLowerCase();
  if (/hotel|होटल|stay|रुक/.test(q)) {
    if (parsedDest || /in\s+\w+|में/.test(q)) return "hotel_only";
    if (/suggest|recommend|find|चाह|बताओ/.test(q)) return "hotel_only";
  }
  if (/vehicle|car|innova|वाहन|गाड़ी|tempo/.test(q) && /\d+\s*people|guests|लोग/.test(q)) {
    return "vehicle_only";
  }
  if (/budget|बजट|₹|rs\.?|rupee/.test(q)) return "custom_package";
  return null;
}

function parseBudget(text: string): number | null {
  const match = text.replace(/,/g, "").match(/(\d{4,7})/);
  return match ? Number(match[1]) : null;
}

function parseGuests(text: string): number | null {
  const match = text.match(/(\d+)\s*(people|guests|person|travelers|लोग)?/i);
  if (match) return Math.min(20, Number(match[1]));
  if (/^(\d|10|5\+)$/.test(text.trim())) {
    const n = text.trim() === "5+" ? 6 : Number(text.trim());
    return n;
  }
  return null;
}

export function initialTravelManagerState(): TravelManagerState {
  return {
    step: "welcome",
    intent: "custom_package",
    selectedActivities: [],
  };
}

export interface StepTransition {
  state: TravelManagerState;
  reply: string;
  quickReplies: QuickReply[];
  nextStep: TravelManagerStep;
}

export function processConversationInput(
  message: string,
  state: TravelManagerState,
  locale: Locale
): StepTransition {
  const text = message.trim();
  const next: TravelManagerState = { ...state, selectedActivities: [...state.selectedActivities] };

  // Free-text intent override
  const parsedDest = parseDestination(text);
  const parsedIntent = parseIntent(text, parsedDest);
  const parsedBudget = parseBudget(text);
  const parsedGuests = parseGuests(text);

  if (parsedIntent === "hotel_only" && parsedDest) {
    next.intent = "hotel_only";
    next.destination = parsedDest;
    next.step = "hotel_budget";
    return {
      state: next,
      reply: t(
        `Great! What's your hotel budget in ${parsedDest}?`,
        `बढ़िया! ${parsedDest} में आपका होटल बजट क्या है?`,
        locale
      ),
      quickReplies: [
        { id: "hb-2000", label: "₹2,000", value: "2000" },
        { id: "hb-5000", label: "₹5,000", value: "5000" },
        { id: "hb-10000", label: "₹10,000", value: "10000" },
        { id: "hb-luxury", label: "Luxury", value: "luxury" },
      ],
      nextStep: "hotel_budget",
    };
  }

  if (parsedIntent === "vehicle_only" || (parsedGuests && /vehicle|car|innova|वाहन|6 people|6 लोग/i.test(text))) {
    next.intent = "vehicle_only";
    next.guests = parsedGuests ?? state.guests ?? 6;
    next.step = "vehicle_results";
    return {
      state: next,
      reply: t(
        `Perfect! Here are vehicles for ${next.guests} guests (live prices from our fleet):`,
        `बढ़िया! ${next.guests} मेहमानों के लिए वाहन (लाइव कीमतें):`,
        locale
      ),
      quickReplies: [],
      nextStep: "vehicle_results",
    };
  }

  switch (state.step) {
    case "welcome":
    case "destination": {
      const dest = parsedDest ?? (DESTINATIONS[text.toLowerCase()] || text);
      next.destination = dest;
      next.step = "trip_type";
      return {
        state: next,
        reply: t(
          `Great choice — ${dest}! What kind of trip do you want?`,
          `बढ़िया चुनाव — ${dest}! आप किस तरह की यात्रा चाहते हैं?`,
          locale
        ),
        quickReplies: TRIP_TYPES.map((tt) => ({
          id: `tt-${tt.id}`,
          label: locale === "hi" ? tt.labelHi : tt.label,
          value: tt.id,
        })),
        nextStep: "trip_type",
      };
    }

    case "trip_type": {
      next.tripType = text.toLowerCase();
      next.step = "activities";
      const acts =
        next.destination?.toLowerCase().includes("manali") ||
        next.tripType === "adventure"
          ? MANALI_ACTIVITIES
          : ["Sightseeing", "Local Tour", "Adventure Activity"];
      return {
        state: next,
        reply: t(
          "Which activities do you like? (Select multiple)",
          "आप कौन सी गतिविधियाँ पसंद करते हैं? (एक से अधिक चुनें)",
          locale
        ),
        quickReplies: [
          ...acts.map((a) => ({ id: `act-${a}`, label: a, value: a })),
          { id: "act-done", label: t("Done ✓", "हो गया ✓", locale), value: "__done__" },
        ],
        nextStep: "activities",
      };
    }

    case "activities": {
      if (text === "__done__" || text.toLowerCase() === "done") {
        next.step = "guests";
      } else if (!next.selectedActivities.includes(text)) {
        next.selectedActivities.push(text);
      }
      if (next.step !== "guests") {
        return {
          state: next,
          reply: t(
            `Added: ${next.selectedActivities.join(", ") || text}. Select more or tap Done.`,
            `जोड़ा: ${next.selectedActivities.join(", ") || text}. और चुनें या Done दबाएं।`,
            locale
          ),
          quickReplies: [
            { id: "act-done", label: t("Done ✓", "हो गया ✓", locale), value: "__done__" },
          ],
          nextStep: "activities",
        };
      }
      return {
        state: next,
        reply: t("How many people are travelling?", "कितने लोग यात्रा कर रहे हैं?", locale),
        quickReplies: ["1", "2", "3", "4", "5+"].map((n) => ({
          id: `g-${n}`,
          label: n,
          value: n,
        })),
        nextStep: "guests",
      };
    }

    case "guests": {
      next.guests = parsedGuests ?? ((text === "5+" ? 6 : Number(text)) || 2);
      next.step = "budget";
      return {
        state: next,
        reply: t("What's your approximate budget?", "आपका अनुमानित बजट क्या है?", locale),
        quickReplies: [
          { id: "b-10000", label: "₹10,000", value: "10000" },
          { id: "b-20000", label: "₹20,000", value: "20000" },
          { id: "b-40000", label: "₹40,000", value: "40000" },
          { id: "b-70000", label: "₹70,000", value: "70000" },
          { id: "b-custom", label: t("Custom", "कस्टम", locale), value: "custom" },
        ],
        nextStep: "budget",
      };
    }

    case "budget": {
      if (text !== "custom") {
        next.budget = parsedBudget ?? (Number(text.replace(/\D/g, "")) || 20000);
      }
      next.step = "duration";
      return {
        state: next,
        reply: t("How many days for your trip?", "यात्रा कितने दिन की होगी?", locale),
        quickReplies: ["3", "4", "5", "6", "7"].map((d) => ({
          id: `d-${d}`,
          label: t(`${d} Days`, `${d} दिन`, locale),
          value: d,
        })),
        nextStep: "duration",
      };
    }

    case "duration": {
      next.durationDays = Number(text) || 5;
      next.step = "package_review";
      return {
        state: next,
        reply: t(
          "Creating your custom package with live prices from our database…",
          "हमारे डेटाबेस से लाइव कीमतों के साथ आपका कस्टम पैकेज बन रहा है…",
          locale
        ),
        quickReplies: [],
        nextStep: "package_review",
      };
    }

    case "hotel_budget": {
      next.hotelBudgetTier = text;
      next.step = "hotel_results";
      return {
        state: next,
        reply: t(
          "Here are hotels matching your budget (live prices):",
          "आपके बजट के अनुसार होटल (लाइव कीमतें):",
          locale
        ),
        quickReplies: [],
        nextStep: "hotel_results",
      };
    }

    case "package_review":
    case "hotel_results":
    case "vehicle_results": {
      if (text.startsWith("book_hotel:")) {
        next.selectedHotelId = text.replace("book_hotel:", "");
        next.intent = "hotel_only";
        next.step = "booking_form";
      } else if (text.startsWith("book_vehicle:")) {
        next.selectedVehicleId = text.replace("book_vehicle:", "");
        next.intent = "vehicle_only";
        next.step = "booking_form";
      } else if (text === "book_package") {
        next.step = "booking_form";
      } else {
        next.step = "booking_form";
      }
      return {
        state: next,
        reply: t(
          "Almost done! Please share your travel details:",
          "लगभग हो गया! कृपया अपनी यात्रा की जानकारी दें:",
          locale
        ),
        quickReplies: [],
        nextStep: "booking_form",
      };
    }

    case "booking_form": {
      if (text.includes("@")) next.customerEmail = text;
      else if (/^\d{10}$/.test(text.replace(/\D/g, "").slice(-10)))
        next.customerPhone = text.replace(/\D/g, "").slice(-10);
      else if (!next.customerName) next.customerName = text;
      else if (!next.travelDate && /\d{4}-\d{2}-\d{2}/.test(text)) next.travelDate = text;
      else if (!next.pickupCity) next.pickupCity = text;

      if (next.customerName && next.customerEmail && next.customerPhone && next.travelDate) {
        next.step = "payment";
        return {
          state: next,
          reply: t(
            "Review your booking summary and tap Pay Now to complete payment via Razorpay.",
            "बुकिंग सारांश देखें और Razorpay से भुगतान के लिए Pay Now दबाएं।",
            locale
          ),
          quickReplies: [{ id: "pay", label: t("Pay Now 💳", "अभी भुगतान करें 💳", locale), value: "__pay__" }],
          nextStep: "payment",
        };
      }

      const missing = [];
      if (!next.customerName) missing.push(t("your name", "आपका नाम", locale));
      else if (!next.customerEmail) missing.push(t("email", "ईमेल", locale));
      else if (!next.customerPhone) missing.push(t("phone", "फ़ोन", locale));
      else if (!next.travelDate) missing.push(t("travel date (YYYY-MM-DD)", "यात्रा तिथि", locale));

      return {
        state: next,
        reply: t(`Please share ${missing[0]}:`, `कृपया ${missing[0]} बताएं:`, locale),
        quickReplies: [],
        nextStep: "booking_form",
      };
    }

    default:
      return {
        state: { ...initialTravelManagerState(), step: "welcome" },
        reply: t(
          "Hello! I am Safar Sathi AI Travel Manager. Where do you want to go?",
          "नमस्ते! मैं Safar Sathi AI Travel Manager हूं। आप कहाँ जाना चाहते हैं?",
          locale
        ),
        quickReplies: welcomeReplies(locale, state.userLocation),
        nextStep: "welcome",
      };
  }
}

export function getWelcomeMessage(
  locale: Locale,
  location?: UserLocationInfo,
  preferences?: AITravelPreferences
): { reply: string; quickReplies: QuickReply[] } {
  let reply = getSmartGreeting(location, locale);

  if (preferences?.favouriteDestinations?.length) {
    const fav = preferences.favouriteDestinations.slice(-2).join(", ");
    reply +=
      locale === "hi"
        ? `\n\nपिछली बार आपने ${fav} पसंद किया था — फिर से वही योजना बनाएं?`
        : `\n\nLast time you liked ${fav} — plan something similar?`;
  }

  if (preferences?.preferredBudget) {
    reply +=
      locale === "hi"
        ? `\n\nआपका पसंदीदा बजट: ₹${preferences.preferredBudget.toLocaleString("en-IN")}`
        : `\n\nYour preferred budget: ₹${preferences.preferredBudget.toLocaleString("en-IN")}`;
  }

  return {
    reply,
    quickReplies: getLocationSuggestions(location, locale),
  };
}

export type { TravelManagerResponse };
