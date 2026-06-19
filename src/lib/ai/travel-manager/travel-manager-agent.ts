import { routeCompletion } from "@/lib/ai/router";
import type { AITravelPreferences, UserLocationInfo } from "@/types/travel-manager";
import {
  buildCustomPackageQuote,
  searchHotelsForDestination,
  searchVehiclesForGuests,
} from "@/lib/ai/travel-manager/live-quote";
import {
  getWelcomeMessage,
  initialTravelManagerState,
  processConversationInput,
} from "@/lib/ai/travel-manager/conversation-engine";
import type { Locale } from "@/types";
import type { TravelManagerResponse, TravelManagerState } from "@/types/travel-manager";

const SYSTEM_EN = `You are Safar Sathi AI Travel Manager — an expert human-like Indian travel agent.
Use ONLY the live catalog data provided in context. Never invent prices.
Be warm, concise, and actionable. Help customers plan trips and book.
Understand natural mixed Hindi-English (Hinglish): "Mujhe Manali jana hai", "Goa family trip", "Budget 20000", "Need hotel in Shimla", "We are 5 people".`;

const SYSTEM_HI = `आप Safar Sathi AI Travel Manager हैं — एक अनुभवी भारतीय ट्रैवल एजेंट।
केवल दिए गए लाइव डेटा की कीमतें उपयोग करें। कभी कीमत न गढ़ें।
गर्मजोशी से, संक्षिप्त और स्पष्ट हिंदी में जवाब दें।
Hinglish भी समझें: "Mujhe Manali jana hai", "Budget 20000", "We are 5 people", "Goa family trip".`;

export interface TravelManagerInput {
  message: string;
  locale?: Locale;
  state?: TravelManagerState;
  userLocation?: UserLocationInfo;
  aiPreferences?: AITravelPreferences;
}

async function enrichReplyWithAi(
  baseReply: string,
  message: string,
  locale: Locale,
  context: string
): Promise<{ reply: string; provider: TravelManagerResponse["provider"] }> {
  try {
    const { content, provider } = await routeCompletion(
      locale === "hi" ? SYSTEM_HI : SYSTEM_EN,
      [{ role: "user", content: `Customer: ${message}\nContext: ${context}\nDraft reply: ${baseReply}\nImprove naturally in 2-3 sentences.` }],
      () => baseReply,
      { maxTokens: 256, timeoutMs: 8000 }
    );
    return { reply: content, provider };
  } catch {
    return { reply: baseReply, provider: "rule-based" };
  }
}

function applyMemoryToState(
  state: TravelManagerState,
  location?: UserLocationInfo,
  preferences?: AITravelPreferences
): TravelManagerState {
  const next = { ...state };
  if (location) next.userLocation = location;
  if (preferences) {
    next.memory = preferences;
    if (preferences.preferredBudget && !next.budget) next.budget = preferences.preferredBudget;
    if (preferences.tripStyle && !next.tripType) next.tripType = preferences.tripStyle;
    if (preferences.hotelCategory && !next.hotelBudgetTier) next.hotelBudgetTier = preferences.hotelCategory;
    if (preferences.vehiclePreference && !next.selectedVehicleId) {
      next.selectedVehicleId = preferences.vehiclePreference;
    }
    if (preferences.lastCity && !next.pickupCity) next.pickupCity = preferences.lastCity;
  }
  return next;
}

export async function runTravelManager(
  input: TravelManagerInput
): Promise<TravelManagerResponse> {
  const locale = input.locale ?? "en";
  const isInit = !input.message || input.message === "__init__";
  const baseState = input.state ?? initialTravelManagerState();
  const state = applyMemoryToState(baseState, input.userLocation, input.aiPreferences);

  if (isInit) {
    const welcome = getWelcomeMessage(locale, input.userLocation ?? state.userLocation, input.aiPreferences);
    return {
      reply: welcome.reply,
      locale,
      state: applyMemoryToState(initialTravelManagerState(), input.userLocation, input.aiPreferences),
      quickReplies: welcome.quickReplies,
      provider: "rule-based",
    };
  }

  const transition = processConversationInput(input.message, state, locale);
  let newState = { ...transition.state, step: transition.nextStep };
  let reply = transition.reply;
  let quickReplies = transition.quickReplies;
  let packageQuote = undefined;
  let hotels = undefined;
  let vehicles = undefined;

  if (newState.step === "package_review" && newState.destination && newState.durationDays && newState.guests) {
    packageQuote = await buildCustomPackageQuote({
      destination: newState.destination,
      tripType: newState.tripType,
      activityNames: newState.selectedActivities,
      guests: newState.guests,
      budget: newState.budget,
      durationDays: newState.durationDays,
      pickupCity: newState.pickupCity,
      locale,
    });

    reply = locale === "hi"
      ? `✨ ${packageQuote.title}\n\nअवधि: ${packageQuote.durationDays} दिन | मेहमान: ${packageQuote.guests}\n${packageQuote.hotel ? `होटल: ${packageQuote.hotel.name} (${packageQuote.hotel.starRating}★)\n` : ""}${packageQuote.vehicle ? `वाहन: ${packageQuote.vehicle.name}\n` : ""}कुल कीमत: ₹${packageQuote.totalAmount.toLocaleString("en-IN")}\n\nबुक करने के लिए "Book Now" दबाएं।`
      : `✨ ${packageQuote.title}\n\nDuration: ${packageQuote.durationDays} days | Guests: ${packageQuote.guests}\n${packageQuote.hotel ? `Hotel: ${packageQuote.hotel.name} (${packageQuote.hotel.starRating}★)\n` : ""}${packageQuote.vehicle ? `Vehicle: ${packageQuote.vehicle.name}\n` : ""}Activities: ${packageQuote.activities.map((a) => a.name).join(", ") || "Included sightseeing"}\nMeals: ${packageQuote.meals.join(", ")}\nPickup: ${packageQuote.pickup}\n\nTotal: ₹${packageQuote.totalAmount.toLocaleString("en-IN")}\n\nTap Book Now to proceed.`;

    quickReplies = [
      { id: "book-pkg", label: locale === "hi" ? "Book Now 📅" : "Book Now 📅", value: "book_package" },
    ];
  }

  if (newState.step === "hotel_results" && newState.destination) {
    hotels = await searchHotelsForDestination(
      newState.destination,
      newState.hotelBudgetTier
    );
    if (hotels.length === 0) {
      reply = locale === "hi"
        ? "इस गंतव्य के लिए कोई होटल नहीं मिला। कृपया दूसरा शहर आज़माएं।"
        : "No hotels found for this destination. Try another city.";
    }
  }

  if (newState.step === "vehicle_results" && newState.guests) {
    vehicles = await searchVehiclesForGuests(newState.guests);
  }

  const context = packageQuote
    ? `Live quote total: ₹${packageQuote.totalAmount}`
    : hotels
      ? `${hotels.length} hotels loaded`
      : vehicles
        ? `${vehicles.length} vehicles loaded`
        : newState.destination ?? "";

  const enriched = await enrichReplyWithAi(reply, input.message, locale, context);

  return {
    reply: enriched.reply,
    locale,
    state: newState,
    quickReplies,
    packageQuote,
    hotels,
    vehicles,
    provider: enriched.provider,
  };
}
