import {
  getSmartGreeting,
  type AITravelPreferences,
  type UserLocationInfo,
} from "@/lib/ai/travel-manager/geo-language";
import { getNativeLanguageAcknowledgment } from "@/lib/ai/travel-manager/native-languages";
import {
  addDaysToIso,
  formatDisplayDate,
  isAcknowledgment,
  isIsoAfter,
  parseFlexibleDate,
  parseNightsFromText,
} from "@/lib/ai/travel-manager/parse-user-input";
import type { Locale } from "@/types";
import type {
  QuickReply,
  TravelManagerState,
  TravelManagerStep,
} from "@/types/travel-manager";

const DESTINATIONS: Record<string, string> = {
  manali: "Manali",
  shimla: "Shimla",
  kashmir: "Kashmir",
  goa: "Goa",
  kerala: "Kerala",
  darjeeling: "Darjeeling",
  jaipur: "Jaipur",
  udaipur: "Udaipur",
  rishikesh: "Rishikesh",
  international: "International",
  custom: "Custom",
};

const PICKUP_CITIES = ["Delhi", "Lucknow", "Mumbai", "Bangalore", "Jaipur", "Kolkata", "Hyderabad"];

const TRIP_TYPES = [
  { id: "honeymoon", label: "❤️ Honeymoon", labelHi: "❤️ हनीमून" },
  { id: "family", label: "👨‍👩‍👧 Family", labelHi: "👨‍👩‍👧 परिवार" },
  { id: "adventure", label: "🏍 Adventure", labelHi: "🏍 एडवेंचर" },
  { id: "yoga", label: "🧘 Yoga", labelHi: "🧘 योग" },
  { id: "budget", label: "💰 Budget", labelHi: "💰 बजट" },
  { id: "luxury", label: "⭐ Luxury", labelHi: "⭐ लक्ज़री" },
  { id: "friends", label: "👬 Friends", labelHi: "👬 दोस्त" },
  { id: "religious", label: "🙏 Religious", labelHi: "🙏 धार्मिक" },
];

const ADVENTURE_ACTIVITIES = [
  "Paragliding",
  "Camping",
  "River Rafting",
  "Trekking",
  "Jeep Safari",
  "Snow Activities",
  "Mountain Biking",
];

function durationStepTransition(
  next: TravelManagerState,
  locale: Locale
): StepTransition {
  const dest = next.destination ?? "";
  next.step = "duration";
  return {
    state: next,
    reply:
      locale === "hi"
        ? dest
          ? `आपकी यात्रा की अवधि कितनी होगी? कृपया बताएं ताकि हम आपकी ${dest} यात्रा के लिए सही योजना बना सकें।`
          : "आपकी यात्रा की अवधि कितनी होगी?"
        : dest
          ? `How many days is your trip? We'll plan the perfect ${dest} itinerary.`
          : "How many days is your trip?",
    quickReplies: ["3", "4", "5", "6", "7"].map((d) => ({
      id: `d-${d}`,
      label: t(`${d} Days`, `${d} दिन`, locale),
      value: d,
    })),
    nextStep: "duration",
  };
}

function t(en: string, hi: string, locale: Locale) {
  return locale === "hi" ? hi : en;
}

function card(id: string, label: string, value: string): QuickReply {
  return { id, label, value, variant: "card" };
}

export function mainMenuReplies(locale: Locale): QuickReply[] {
  return [
    card("m-tour", t("🏔 Tour Packages", "🏔 टूर पैकेज", locale), "__intent:tour_packages"),
    card("m-vehicle", t("🚘 Vehicles", "🚘 वाहन", locale), "__intent:vehicle_only"),
    card("m-hotel", t("🏨 Hotels", "🏨 होटल", locale), "__intent:hotel_only"),
    card("m-bus", t("🚌 Bus Booking", "🚌 बस बुकिंग", locale), "__intent:bus_booking"),
    card("m-intl", t("✈ International Tour", "✈ विदेश यात्रा", locale), "__intent:international"),
    card("m-custom", t("🎒 Custom Tour", "🎒 कस्टम टूर", locale), "__intent:custom_tour"),
  ];
}

function destinationReplies(locale: Locale): QuickReply[] {
  const dests = ["Manali", "Shimla", "Kashmir", "Goa", "Kerala", "Darjeeling", "Jaipur"];
  return [
    ...dests.map((d, i) => ({ id: `dest-${i}`, label: d, value: d })),
    { id: "dest-custom", label: t("Custom Destination", "कस्टम गंतव्य", locale), value: "Custom" },
  ];
}

function pickupReplies(locale: Locale): QuickReply[] {
  return [
    ...PICKUP_CITIES.map((c, i) => ({ id: `pick-${i}`, label: c, value: c })),
    { id: "pick-custom", label: t("Custom City", "अन्य शहर", locale), value: "custom_city" },
  ];
}

function guestCountReplies(locale: Locale): QuickReply[] {
  return ["1", "2", "3", "4", "5+"].map((n) => ({ id: `g-${n}`, label: n, value: n }));
}

function hotelNightChips(locale: Locale): QuickReply[] {
  return [1, 2, 3, 4, 5].map((n) => ({
    id: `n-${n}`,
    label: locale === "hi" ? `${n} रात` : `${n} night${n > 1 ? "s" : ""}`,
    value: String(n),
  }));
}

function hotelCheckInPrompt(locale: Locale): string {
  return locale === "hi"
    ? "📅 चेक-इन तारीख — कैलेंडर से चुनें या तारीख टाइप करें (जैसे 25 Aug या 2026-08-25):"
    : "📅 Check-in date — pick from the calendar or type a date (e.g. 25 Aug or 2026-08-25):";
}

function hotelCheckOutPrompt(checkIn: string, locale: Locale): string {
  const display = formatDisplayDate(checkIn, locale);
  return locale === "hi"
    ? `✅ चेक-इन: ${display}\n\n📅 चेक-आउट — कैलेंडर से चुनें, रातें चुनें (नीचे), या तारीख टाइप करें (जैसे 25 को):`
    : `✅ Check-in: ${display}\n\n📅 Check-out — use the calendar, tap nights below, or type a date (e.g. 25 Aug):`;
}

const HOTEL_BUDGET_TIERS = ["2000", "5000", "10000", "luxury"] as const;

export function hotelBudgetQuickReplies(locale: Locale): QuickReply[] {
  return [
    {
      id: "hb-all",
      label: locale === "hi" ? "सभी होटल" : "All Hotels",
      value: "__hotel_budget_all__",
    },
    { id: "hb-2", label: "₹2,000", value: "2000" },
    { id: "hb-5", label: "₹5,000", value: "5000" },
    { id: "hb-10", label: "₹10,000", value: "10000" },
    { id: "hb-l", label: locale === "hi" ? "लक्ज़री" : "Luxury", value: "luxury" },
    {
      id: "hb-up",
      label: locale === "hi" ? "बजट बढ़ाएं" : "Higher Budget",
      value: "__hotel_budget_increase__",
    },
  ];
}

function resolveHotelBudgetInput(
  text: string,
  currentTier?: string
): { tier?: string; clear?: boolean; increase?: boolean } | null {
  if (text === "__hotel_budget_all__" || text === "skip" || text === "__skip_budget__") {
    return { clear: true };
  }
  if (text === "__hotel_budget_increase__") {
    return { increase: true };
  }
  if (HOTEL_BUDGET_TIERS.includes(text as (typeof HOTEL_BUDGET_TIERS)[number])) {
    return { tier: text };
  }

  const lower = text.toLowerCase();
  if (/^(2000|5000|10000)$/.test(lower.replace(/,/g, ""))) {
    return { tier: lower.replace(/,/g, "") };
  }
  if (/luxury|लक्ज़री|लक्जरी/.test(lower)) {
    return { tier: "luxury" };
  }
  if (/increase|badha|badh|zyada|higher|बढ़|बढा|budget increase|budged increase/i.test(lower)) {
    return { increase: true };
  }
  if (/show all|all hotel|sab hotel|सभी|without budget|no filter|skip budget/i.test(lower)) {
    return { clear: true };
  }
  return null;
}

function applyHotelBudgetInput(
  state: TravelManagerState,
  text: string
): TravelManagerState {
  const next = { ...state };
  const resolved = resolveHotelBudgetInput(text, state.hotelBudgetTier);
  if (!resolved) return next;

  if (resolved.clear) {
    delete next.hotelBudgetTier;
    return next;
  }
  if (resolved.increase) {
    const idx = state.hotelBudgetTier
      ? HOTEL_BUDGET_TIERS.indexOf(state.hotelBudgetTier as (typeof HOTEL_BUDGET_TIERS)[number])
      : -1;
    const nextTier = HOTEL_BUDGET_TIERS[idx + 1];
    if (nextTier) next.hotelBudgetTier = nextTier;
    else delete next.hotelBudgetTier;
    return next;
  }
  if (resolved.tier) {
    next.hotelBudgetTier = resolved.tier;
  }
  return next;
}

function hotelResultsReply(locale: Locale, destination?: string, hasFilter?: boolean): string {
  const dest = destination ?? "";
  if (hasFilter) {
    return locale === "hi"
      ? `🏨 ${dest} — फ़िल्टर किए होटल। बुक करने के लिए कार्ड टैप करें। बजट बदलने के लिए नीचे चुनें:`
      : `🏨 ${dest} — filtered hotels. Tap a card to book. Change budget below:`;
  }
  return locale === "hi"
    ? `🏨 ${dest} के होटल (लाइव कीमतें)। बुक करने के लिए कार्ड टैप करें — चाहें तो नीचे से बजट फ़िल्टर करें:`
    : `🏨 Hotels in ${dest} (live prices). Tap a card to book — filter by budget below if you like:`;
}

function parseDestination(text: string): string | null {
  const q = text.toLowerCase();
  for (const [key, val] of Object.entries(DESTINATIONS)) {
    if (q.includes(key)) return val;
  }
  if (/manali|मनाली/.test(q)) return "Manali";
  if (/shimla|शिमला/.test(q)) return "Shimla";
  if (/goa|गोवा/.test(q)) return "Goa";
  if (/kashmir|कश्मीर/.test(q)) return "Kashmir";
  if (/kerala|केरल/.test(q)) return "Kerala";
  if (/darjeeling/.test(q)) return "Darjeeling";
  if (/jaipur|जयपुर/.test(q)) return "Jaipur";
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
    return text.trim() === "5+" ? 6 : Number(text.trim());
  }
  return null;
}

function passengerRangeToGuests(text: string): number {
  if (text.includes("1-4") || text === "1") return 4;
  if (text.includes("5-7") || text === "5") return 6;
  if (text.includes("8-12")) return 10;
  if (text.includes("13-20")) return 15;
  if (text.includes("20+")) return 22;
  return parseGuests(text) ?? 4;
}

export function initialTravelManagerState(): TravelManagerState {
  return {
    step: "welcome",
    intent: "general",
    selectedActivities: [],
    guests: 2,
    customizeFlags: {},
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
  const next: TravelManagerState = {
    ...state,
    selectedActivities: [...(state.selectedActivities ?? [])],
    customizeFlags: { ...(state.customizeFlags ?? {}) },
  };

  if (text.startsWith("__intent:")) {
    const intent = text.replace("__intent:", "") as TravelManagerState["intent"];
    next.intent = intent;

    if (intent === "tour_packages" || intent === "custom_tour" || intent === "international") {
      next.intent = intent === "international" ? "international" : "tour_packages";
      next.step = "destination";
      return {
        state: next,
        reply: t("Where do you want to go?", "आप कहाँ जाना चाहते हैं?", locale),
        quickReplies: destinationReplies(locale),
        nextStep: "destination",
      };
    }
    if (intent === "vehicle_only") {
      next.step = "vehicle_passengers";
      return {
        state: next,
        reply: t("How many passengers?", "कितने यात्री हैं?", locale),
        quickReplies: [
          { id: "p1", label: "1-4", value: "1-4" },
          { id: "p2", label: "5-7", value: "5-7" },
          { id: "p3", label: "8-12", value: "8-12" },
          { id: "p4", label: "13-20", value: "13-20" },
          { id: "p5", label: "20+", value: "20+" },
        ],
        nextStep: "vehicle_passengers",
      };
    }
    if (intent === "hotel_only") {
      next.step = "hotel_destination";
      return {
        state: next,
        reply: t("Which destination?", "कौन सा गंतव्य?", locale),
        quickReplies: destinationReplies(locale),
        nextStep: "hotel_destination",
      };
    }
    if (intent === "bus_booking") {
      return {
        state: next,
        reply: t(
          "Opening Bus Booking — complete your ticket on the next page.",
          "बस बुकिंग — अगले पेज पर टिकट पूरी करें।",
          locale
        ),
        quickReplies: [
          {
            id: "bus-go",
            label: t("Go to Bus Booking 🚌", "बस बुकिंग पर जाएं 🚌", locale),
            value: "__link:/bus-booking",
          },
          { id: "bus-back", label: t("Back to Menu", "वापस मेनू", locale), value: "__menu__" },
        ],
        nextStep: "welcome",
      };
    }
  }

  if (text === "__menu__") {
    return {
      state: { ...initialTravelManagerState(), userLocation: state.userLocation, memory: state.memory },
      reply: t("Hello 👋\n\nWhat would you like today?", "नमस्ते 👋\n\nआज आप क्या चाहेंगे?", locale),
      quickReplies: mainMenuReplies(locale),
      nextStep: "welcome",
    };
  }

  if (text.startsWith("select_tier:")) {
    next.selectedTierId = text.replace("select_tier:", "");
    next.step = "package_review";
    return {
      state: next,
      reply: t("Great choice! Here is your package summary.", "बढ़िया! यह आपका पैकेज है।", locale),
      quickReplies: [
        { id: "book", label: t("Book Now 📅", "अभी बुक करें 📅", locale), value: "book_package" },
        { id: "customize", label: t("Customize", "कस्टमाइज़", locale), value: "__customize__" },
        { id: "human", label: t("Talk To Human", "एजेंट से बात", locale), value: "__human__" },
      ],
      nextStep: "package_review",
    };
  }

  if (text.startsWith("customize_tier:")) {
    next.selectedTierId = text.replace("customize_tier:", "");
    next.step = "customize";
    return {
      state: next,
      reply: t(
        "Customize your package — what would you like to change?",
        "अपना पैकेज कस्टमाइज़ करें — क्या बदलना चाहते हैं?",
        locale
      ),
      quickReplies: [
        { id: "c-rh", label: t("Remove Hotel", "होटल हटाएं", locale), value: "mod:remove_hotel" },
        { id: "c-rv", label: t("Remove Vehicle", "वाहन हटाएं", locale), value: "mod:remove_vehicle" },
        { id: "c-en", label: t("Add Extra Nights", "अतिरिक्त रातें", locale), value: "mod:extra_night" },
        { id: "c-ap", label: t("Add Airport Pickup", "एयरपोर्ट पिकअप", locale), value: "mod:airport" },
        { id: "c-gd", label: t("Add Guide", "गाइड जोड़ें", locale), value: "mod:guide" },
        { id: "c-done", label: t("Done ✓", "हो गया ✓", locale), value: "mod:done" },
      ],
      nextStep: "customize",
    };
  }

  if (text === "__customize__") {
    next.step = "customize";
    return {
      state: next,
      reply: t("What would you like to change?", "आप क्या बदलना चाहते हैं?", locale),
      quickReplies: [
        { id: "c-rh", label: t("Remove Hotel", "होटल हटाएं", locale), value: "mod:remove_hotel" },
        { id: "c-rv", label: t("Remove Vehicle", "वाहन हटाएं", locale), value: "mod:remove_vehicle" },
        { id: "c-en", label: t("Add Extra Nights", "अतिरिक्त रातें", locale), value: "mod:extra_night" },
        { id: "c-ap", label: t("Add Airport Pickup", "एयरपोर्ट पिकअप", locale), value: "mod:airport" },
        { id: "c-gd", label: t("Add Guide", "गाइड जोड़ें", locale), value: "mod:guide" },
        { id: "c-done", label: t("Done ✓", "हो गया ✓", locale), value: "mod:done" },
      ],
      nextStep: "customize",
    };
  }

  if (text.startsWith("mod:")) {
    const mod = text.replace("mod:", "");
    if (mod === "remove_hotel") next.customizeFlags = { ...next.customizeFlags, removeHotel: true };
    if (mod === "remove_vehicle") next.customizeFlags = { ...next.customizeFlags, removeVehicle: true };
    if (mod === "extra_night")
      next.customizeFlags = { ...next.customizeFlags, extraNights: (next.customizeFlags?.extraNights ?? 0) + 1 };
    if (mod === "airport") next.customizeFlags = { ...next.customizeFlags, addAirportPickup: true };
    if (mod === "guide") next.customizeFlags = { ...next.customizeFlags, addGuide: true };
    if (mod === "done") {
      next.step = "package_review";
      return {
        state: next,
        reply: t("Updated package with new price:", "नई कीमत के साथ अपडेटेड पैकेज:", locale),
        quickReplies: [
          { id: "book", label: t("Book Now 📅", "अभी बुक करें 📅", locale), value: "book_package" },
          { id: "mod-again", label: t("Modify Again", "फिर से बदलें", locale), value: "__customize__" },
        ],
        nextStep: "package_review",
      };
    }
    return {
      state: next,
      reply: t("Change applied. Tap more or Done.", "बदलाव लागू। और चुनें या Done।", locale),
      quickReplies: [{ id: "c-done", label: t("Done ✓", "हो गया ✓", locale), value: "mod:done" }],
      nextStep: "customize",
    };
  }

  if (text === "__human__") {
    return {
      state: next,
      reply: t(
        "Our travel expert will call you shortly. Contact: +91-9876543210",
        "हमारा एक्सपर्ट जल्द कॉल करेगा। संपर्क: +91-9876543210",
        locale
      ),
      quickReplies: [{ id: "menu", label: t("Back to Menu", "वापस मेनू", locale), value: "__menu__" }],
      nextStep: next.step,
    };
  }

  const parsedDest = parseDestination(text);
  const parsedBudget = parseBudget(text);
  const parsedGuests = parseGuests(text);

  switch (state.step) {
    case "welcome":
      return {
        state: next,
        reply: t("Hello 👋\n\nWhat would you like today?", "नमस्ते 👋\n\nआज आप क्या चाहेंगे?", locale),
        quickReplies: mainMenuReplies(locale),
        nextStep: "welcome",
      };

    case "destination": {
      const dest = parsedDest ?? DESTINATIONS[text.toLowerCase()] ?? text;
      next.destination = dest;
      next.step = "pickup_city";
      return {
        state: next,
        reply: t("Where are you travelling from?", "आप कहाँ से यात्रा शुरू करेंगे?", locale),
        quickReplies: pickupReplies(locale),
        nextStep: "pickup_city",
      };
    }

    case "pickup_city": {
      if (text === "custom_city") {
        return {
          state: next,
          reply: t("Please type your city name:", "कृपया शहर का नाम लिखें:", locale),
          quickReplies: [],
          nextStep: "pickup_city",
        };
      }
      next.pickupCity = text;
      next.step = "trip_type";
      return {
        state: next,
        reply: t("What type of trip do you prefer?", "किस तरह की यात्रा?", locale),
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
      if (next.tripType === "adventure") {
        next.step = "activities";
        return {
          state: next,
          reply: t("Select activities (multiple):", "गतिविधियाँ चुनें:", locale),
          quickReplies: [
            ...ADVENTURE_ACTIVITIES.map((a) => ({ id: `act-${a}`, label: a, value: a })),
            { id: "act-done", label: t("Done ✓", "हो गया ✓", locale), value: "__done__" },
          ],
          nextStep: "activities",
        };
      }
      return durationStepTransition(next, locale);
    }

    case "activities": {
      if (text === "__done__" || text.toLowerCase() === "done") {
        return durationStepTransition(next, locale);
      }
      if (!next.selectedActivities.includes(text)) next.selectedActivities.push(text);
      return {
        state: next,
        reply: t(`Added: ${next.selectedActivities.join(", ")}`, `जोड़ा: ${next.selectedActivities.join(", ")}`, locale),
        quickReplies: [{ id: "act-done", label: t("Done ✓", "हो गया ✓", locale), value: "__done__" }],
        nextStep: "activities",
      };
    }

    case "budget": {
      return durationStepTransition(next, locale);
    }

    case "duration": {
      next.durationDays = Number(text) || 5;
      next.step = "package_tiers";
      return {
        state: next,
        reply: t(
          "Creating 4 packages with live prices…",
          "लाइव कीमतों के साथ 4 पैकेज बन रहे हैं…",
          locale
        ),
        quickReplies: [],
        nextStep: "package_tiers",
      };
    }

    case "vehicle_passengers": {
      next.guests = passengerRangeToGuests(text);
      next.step = "vehicle_results";
      return {
        state: next,
        reply: t(`Vehicles for ${next.guests} passengers:`, `${next.guests} यात्रियों के लिए वाहन:`, locale),
        quickReplies: [],
        nextStep: "vehicle_results",
      };
    }

    case "hotel_destination": {
      next.destination = parsedDest ?? text;
      next.step = "hotel_dates";
      return {
        state: next,
        reply: hotelCheckInPrompt(locale),
        quickReplies: [],
        nextStep: "hotel_dates",
      };
    }

    case "hotel_dates": {
      if (!next.travelDate) {
        const checkIn = parseFlexibleDate(text);
        if (checkIn) {
          next.travelDate = checkIn;
          return {
            state: next,
            reply: hotelCheckOutPrompt(checkIn, locale),
            quickReplies: hotelNightChips(locale),
            nextStep: "hotel_dates",
          };
        }
        return {
          state: next,
          reply: isAcknowledgment(text)
            ? t(
                "Please pick check-in from the calendar or type a date.",
                "कृपया कैलेंडर से चेक-इन चुनें या तारीख टाइप करें।",
                locale
              )
            : hotelCheckInPrompt(locale),
          quickReplies: [],
          nextStep: "hotel_dates",
        };
      }

      const nights = parseNightsFromText(text, { checkoutPhase: true });
      if (nights) {
        next.checkOutDate = addDaysToIso(next.travelDate, nights);
        next.step = "guests";
        return {
          state: next,
          reply: t("How many guests?", "कितने मेहमान?", locale),
          quickReplies: guestCountReplies(locale),
          nextStep: "guests",
        };
      }

      const checkOut = parseFlexibleDate(text, { referenceCheckIn: next.travelDate });
      if (checkOut && isIsoAfter(checkOut, next.travelDate)) {
        next.checkOutDate = checkOut;
        next.step = "guests";
        return {
          state: next,
          reply: t("How many guests?", "कितने मेहमान?", locale),
          quickReplies: guestCountReplies(locale),
          nextStep: "guests",
        };
      }

      return {
        state: next,
        reply: isAcknowledgment(text)
          ? hotelCheckOutPrompt(next.travelDate, locale)
          : t(
              "Please pick check-out from the calendar, tap nights (1–5), or type a date like 25 Aug.",
              "कृपया कैलेंडर से चेक-आउट चुनें, रातें टैप करें (1–5), या तारीख टाइप करें (जैसे 25 Aug)।",
              locale
            ),
        quickReplies: hotelNightChips(locale),
        nextStep: "hotel_dates",
      };
    }

    case "guests": {
      next.guests = parsedGuests ?? ((text === "5+" ? 6 : Number(text)) || 2);
      if (next.intent === "hotel_only") {
        next.step = "hotel_results";
        return {
          state: next,
          reply: hotelResultsReply(locale, next.destination, false),
          quickReplies: hotelBudgetQuickReplies(locale),
          nextStep: "hotel_results",
        };
      }
      return durationStepTransition(next, locale);
    }

    case "hotel_budget": {
      const withBudget = applyHotelBudgetInput(next, text);
      withBudget.step = "hotel_results";
      return {
        state: withBudget,
        reply: hotelResultsReply(locale, withBudget.destination, Boolean(withBudget.hotelBudgetTier)),
        quickReplies: hotelBudgetQuickReplies(locale),
        nextStep: "hotel_results",
      };
    }

    case "package_tiers":
      return {
        state: next,
        reply: t("Please select a package from the cards above.", "ऊपर से पैकेज चुनें।", locale),
        quickReplies: [],
        nextStep: "package_tiers",
      };

    case "package_review":
      if (text === "book_package") {
        next.step = "booking_form";
        return {
          state: next,
          reply: t(
            "Share booking details — Name, Email, Phone, Travel Date:",
            "बुकिंग विवरण — नाम, ईमेल, फ़ोन, यात्रा तिथि:",
            locale
          ),
          quickReplies: [],
          nextStep: "booking_form",
        };
      }
      return {
        state: next,
        reply: t("Your package summary is shown above.", "आपका पैकेज ऊपर दिख रहा है।", locale),
        quickReplies: [
          { id: "book", label: t("Book Now 📅", "अभी बुक करें 📅", locale), value: "book_package" },
          { id: "customize", label: t("Customize", "कस्टमाइज़", locale), value: "__customize__" },
          { id: "human", label: t("Talk To Human", "एजेंट से बात", locale), value: "__human__" },
        ],
        nextStep: "package_review",
      };

    case "customize":
      return {
        state: next,
        reply: t("What would you like to change?", "आप क्या बदलना चाहते हैं?", locale),
        quickReplies: [
          { id: "c-rh", label: t("Remove Hotel", "होटल हटाएं", locale), value: "mod:remove_hotel" },
          { id: "c-rv", label: t("Remove Vehicle", "वाहन हटाएं", locale), value: "mod:remove_vehicle" },
          { id: "c-en", label: t("Add Extra Nights", "अतिरिक्त रातें", locale), value: "mod:extra_night" },
          { id: "c-ap", label: t("Add Airport Pickup", "एयरपोर्ट पिकअप", locale), value: "mod:airport" },
          { id: "c-gd", label: t("Add Guide", "गाइड जोड़ें", locale), value: "mod:guide" },
          { id: "c-done", label: t("Done ✓", "हो गया ✓", locale), value: "mod:done" },
        ],
        nextStep: "customize",
      };

    case "hotel_results": {
      if (text.startsWith("book_hotel:")) {
        next.selectedHotelId = text.replace("book_hotel:", "");
        next.step = "booking_form";
        return {
          state: next,
          reply: t(
            "Share booking details — Name, Email, Phone, Travel Date:",
            "बुकिंग विवरण — नाम, ईमेल, फ़ोन, यात्रा तिथि:",
            locale
          ),
          quickReplies: [],
          nextStep: "booking_form",
        };
      }

      const budgetResolved = resolveHotelBudgetInput(text, next.hotelBudgetTier);
      if (budgetResolved) {
        const withBudget = applyHotelBudgetInput(next, text);
        withBudget.step = "hotel_results";
        return {
          state: withBudget,
          reply: hotelResultsReply(locale, withBudget.destination, Boolean(withBudget.hotelBudgetTier)),
          quickReplies: hotelBudgetQuickReplies(locale),
          nextStep: "hotel_results",
        };
      }

      return {
        state: next,
        reply: t(
          "Tap a hotel card to book, or choose a budget filter below.",
          "बुक करने के लिए होटल कार्ड टैप करें, या नीचे से बजट फ़िल्टर चुनें।",
          locale
        ),
        quickReplies: hotelBudgetQuickReplies(locale),
        nextStep: "hotel_results",
      };
    }

    case "vehicle_results": {
      if (text.startsWith("book_vehicle:")) {
        next.selectedVehicleId = text.replace("book_vehicle:", "");
        next.step = "booking_form";
        return {
          state: next,
          reply: t(
            "Share booking details — Name, Email, Phone, Travel Date:",
            "बुकिंग विवरण — नाम, ईमेल, फ़ोन, यात्रा तिथि:",
            locale
          ),
          quickReplies: [],
          nextStep: "booking_form",
        };
      }
      return {
        state: next,
        reply: t(
          "Tap a vehicle card to book.",
          "बुक करने के लिए वाहन कार्ड टैप करें।",
          locale
        ),
        quickReplies: [],
        nextStep: "vehicle_results",
      };
    }

    case "booking_form": {
      if (text.includes("@")) next.customerEmail = text;
      else if (/^\d{10}$/.test(text.replace(/\D/g, "").slice(-10)))
        next.customerPhone = text.replace(/\D/g, "").slice(-10);
      else if (!next.customerName) next.customerName = text;
      else if (!next.travelDate) {
        const parsedDate = parseFlexibleDate(text);
        if (parsedDate) next.travelDate = parsedDate;
      }
      else if (parsedGuests) next.guests = parsedGuests;
      else if (text.length > 3) next.specialRequest = text;

      if (next.customerName && next.customerEmail && next.customerPhone && next.travelDate) {
        next.step = "payment";
        return {
          state: next,
          reply: t(
            "Pay securely via Razorpay — UPI, GPay, PhonePe, Cards, Net Banking.",
            "Razorpay से भुगतान — UPI, GPay, PhonePe, कार्ड।",
            locale
          ),
          quickReplies: [{ id: "pay", label: t("Pay Now 💳", "अभी भुगतान 💳", locale), value: "__pay__" }],
          nextStep: "payment",
        };
      }

      const missing = [];
      if (!next.customerName) missing.push(t("name", "नाम", locale));
      else if (!next.customerEmail) missing.push(t("email", "ईमेल", locale));
      else if (!next.customerPhone) missing.push(t("phone", "फ़ोन", locale));
      else if (!next.travelDate) missing.push(t("travel date", "यात्रा तिथि", locale));

      return {
        state: next,
        reply: t(`Please share ${missing[0]}:`, `कृपया ${missing[0]} बताएं:`, locale),
        quickReplies: [],
        nextStep: "booking_form",
      };
    }

    default:
      return {
        state: { ...initialTravelManagerState(), userLocation: state.userLocation },
        reply: t("Hello 👋\n\nWhat would you like today?", "नमस्ते 👋\n\nआज आप क्या चाहेंगे?", locale),
        quickReplies: mainMenuReplies(locale),
        nextStep: "welcome",
      };
  }
}

export function getWelcomeMessage(
  locale: Locale,
  location?: UserLocationInfo,
  preferences?: AITravelPreferences
): { reply: string; quickReplies: QuickReply[] } {
  let reply =
    locale === "hi"
      ? "नमस्ते 👋\n\nमैं Safar Sathi AI Travel Manager हूँ।\n\nआज आप क्या चाहेंगे?"
      : "Hello 👋\n\nI am Safar Sathi AI Travel Manager.\n\nWhat would you like today?";

  if (location?.city) {
    reply = getSmartGreeting(location, locale);
    reply += locale === "hi" ? "\n\nआज आप क्या चाहेंगे?" : "\n\nWhat would you like today?";
  }

  if (preferences?.favouriteDestinations?.length) {
    const fav = preferences.favouriteDestinations.slice(-1)[0];
    reply += locale === "hi" ? `\n\nपिछली बार: ${fav}` : `\n\nLast interest: ${fav}`;
  }

  reply += getNativeLanguageAcknowledgment(preferences?.nativeLanguage, locale);

  return { reply, quickReplies: mainMenuReplies(locale) };
}

/** Rebuild UI labels for current step (language switch without losing progress) */
export function getStepUiForState(
  state: TravelManagerState,
  locale: Locale
): { reply: string; quickReplies: QuickReply[] } {
  switch (state.step) {
    case "welcome":
      return {
        reply: t("Hello 👋\n\nWhat would you like today?", "नमस्ते 👋\n\nआज आप क्या चाहेंगे?", locale),
        quickReplies: mainMenuReplies(locale),
      };
    case "destination":
      return {
        reply: t("Where do you want to go?", "आप कहाँ जाना चाहते हैं?", locale),
        quickReplies: destinationReplies(locale),
      };
    case "pickup_city":
      return {
        reply: t("Where are you travelling from?", "आप कहाँ से यात्रा शुरू करेंगे?", locale),
        quickReplies: pickupReplies(locale),
      };
    case "trip_type":
      return {
        reply: t("What type of trip do you prefer?", "किस तरह की यात्रा?", locale),
        quickReplies: TRIP_TYPES.map((tt) => ({
          id: `tt-${tt.id}`,
          label: locale === "hi" ? tt.labelHi : tt.label,
          value: tt.id,
        })),
      };
    case "activities":
      return {
        reply: t("Select activities (multiple):", "गतिविधियाँ चुनें:", locale),
        quickReplies: [
          ...ADVENTURE_ACTIVITIES.map((a) => ({ id: `act-${a}`, label: a, value: a })),
          { id: "act-done", label: t("Done ✓", "हो गया ✓", locale), value: "__done__" },
        ],
      };
    case "budget":
    case "duration": {
      const dest = state.destination ?? "";
      return {
        reply:
          locale === "hi"
            ? dest
              ? `आपकी यात्रा की अवधि कितनी होगी? कृपया बताएं ताकि हम आपकी ${dest} यात्रा के लिए सही योजना बना सकें।`
              : "आपकी यात्रा की अवधि कितनी होगी?"
            : dest
              ? `How many days is your trip? We'll plan the perfect ${dest} itinerary.`
              : "How many days is your trip?",
        quickReplies: ["3", "4", "5", "6", "7"].map((d) => ({
          id: `d-${d}`,
          label: t(`${d} Days`, `${d} दिन`, locale),
          value: d,
        })),
      };
    }
    case "package_tiers":
      return {
        reply:
          locale === "hi"
            ? `✨ ${state.destination ?? ""} के लिए 4 पैकेज — ऊपर से चुनें।`
            : `✨ 4 packages for ${state.destination ?? ""} — select above.`,
        quickReplies: [],
      };
    case "customize":
      return {
        reply: t("What would you like to change?", "आप क्या बदलना चाहते हैं?", locale),
        quickReplies: [
          { id: "c-rh", label: t("Remove Hotel", "होटल हटाएं", locale), value: "mod:remove_hotel" },
          { id: "c-rv", label: t("Remove Vehicle", "वाहन हटाएं", locale), value: "mod:remove_vehicle" },
          { id: "c-en", label: t("Add Extra Nights", "अतिरिक्त रातें", locale), value: "mod:extra_night" },
          { id: "c-ap", label: t("Add Airport Pickup", "एयरपोर्ट पिकअप", locale), value: "mod:airport" },
          { id: "c-gd", label: t("Add Guide", "गाइड जोड़ें", locale), value: "mod:guide" },
          { id: "c-done", label: t("Done ✓", "हो गया ✓", locale), value: "mod:done" },
        ],
      };
    case "package_review":
      return {
        reply: t("Your package summary is shown above.", "आपका पैकेज ऊपर दिख रहा है।", locale),
        quickReplies: [
          { id: "book", label: t("Book Now 📅", "अभी बुक करें 📅", locale), value: "book_package" },
          { id: "customize", label: t("Customize", "कस्टमाइज़", locale), value: "__customize__" },
          { id: "human", label: t("Talk To Human", "एजेंट से बात", locale), value: "__human__" },
        ],
      };
    case "vehicle_passengers":
      return {
        reply: t("How many passengers?", "कितने यात्री?", locale),
        quickReplies: [
          { id: "p1", label: "1-4", value: "1-4" },
          { id: "p2", label: "5-7", value: "5-7" },
          { id: "p3", label: "8-12", value: "8-12" },
          { id: "p4", label: "13-20", value: "13-20" },
          { id: "p5", label: "20+", value: "20+" },
        ],
      };
    case "hotel_destination":
      return {
        reply: t("Which city for your hotel stay?", "किस शहर में होटल चाहिए?", locale),
        quickReplies: destinationReplies(locale),
      };
    case "hotel_dates":
      if (state.travelDate) {
        return {
          reply: hotelCheckOutPrompt(state.travelDate, locale),
          quickReplies: hotelNightChips(locale),
        };
      }
      return {
        reply: hotelCheckInPrompt(locale),
        quickReplies: [],
      };
    case "guests":
      return {
        reply: t("How many guests?", "कितने मेहमान?", locale),
        quickReplies: guestCountReplies(locale),
      };
    case "hotel_budget":
      return {
        reply: t(
          "Filter hotels by budget (optional):",
          "बजट से होटल फ़िल्टर करें (वैकल्पिक):",
          locale
        ),
        quickReplies: hotelBudgetQuickReplies(locale),
      };
    case "hotel_results":
      return {
        reply: hotelResultsReply(locale, state.destination, Boolean(state.hotelBudgetTier)),
        quickReplies: hotelBudgetQuickReplies(locale),
      };
    default:
      return {
        reply: t("Hello 👋\n\nWhat would you like today?", "नमस्ते 👋\n\nआज आप क्या चाहेंगे?", locale),
        quickReplies: mainMenuReplies(locale),
      };
  }
}
