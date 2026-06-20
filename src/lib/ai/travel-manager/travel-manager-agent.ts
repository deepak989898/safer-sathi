import { routeCompletion } from "@/lib/ai/router";
import type { AITravelPreferences, UserLocationInfo } from "@/types/travel-manager";
import {
  buildTierPackages,
  recalculateSelectedTier,
  type TierPackageQuote,
} from "@/lib/ai/travel-manager/package-tier-builder";
import {
  searchHotelsForDestination,
  searchVehiclesForGuests,
} from "@/lib/ai/travel-manager/live-quote";
import {
  getWelcomeMessage,
  initialTravelManagerState,
  processConversationInput,
} from "@/lib/ai/travel-manager/conversation-engine";
import type { Locale } from "@/types";
import type { CustomPackageQuote, TravelManagerResponse, TravelManagerState } from "@/types/travel-manager";

const SYSTEM_EN = `You are Safar Sathi AI Travel Manager — a professional human-like Indian travel agent.
Use ONLY live catalog prices in context. Never invent prices. Be warm and concise.
Understand Hinglish naturally.`;

const SYSTEM_HI = `आप Safar Sathi AI Travel Manager हैं — पेशेवर भारतीय ट्रैवल एजेंट।
केवल लाइव कीमतें उपयोग करें। Hinglish समझें।`;

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
      [
        {
          role: "user",
          content: `Customer: ${message}\nContext: ${context}\nDraft: ${baseReply}\nImprove in 2 sentences max.`,
        },
      ],
      () => baseReply,
      { maxTokens: 200, timeoutMs: 6000 }
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
    if (preferences.lastCity && !next.pickupCity) next.pickupCity = preferences.lastCity;
  }
  return next;
}

function tierBuildInput(state: TravelManagerState, locale: Locale) {
  return {
    destination: state.destination ?? "Manali",
    pickupCity: state.pickupCity ?? state.userLocation?.city ?? "Delhi",
    tripType: state.tripType,
    activityNames: state.selectedActivities,
    guests: state.guests ?? 2,
    budget: state.budget,
    baseDurationDays: state.durationDays ?? 4,
    locale,
  };
}

async function resolvePackageQuote(
  state: TravelManagerState,
  tiers: TierPackageQuote[],
  locale: Locale
): Promise<CustomPackageQuote | undefined> {
  const tierId = state.selectedTierId ?? "standard";
  let quote = tiers.find((t) => t.tierId === tierId) ?? tiers[0];
  if (!quote) return undefined;

  const flags = state.customizeFlags;
  if (flags && (flags.removeHotel || flags.removeVehicle || flags.extraNights || flags.addGuide || flags.addAirportPickup)) {
    quote = await recalculateSelectedTier(quote, tierBuildInput(state, locale), {
      removeHotel: flags.removeHotel,
      removeVehicle: flags.removeVehicle,
      extraNights: flags.extraNights,
    });
    if (flags.addGuide) quote.totalAmount += 2500;
    if (flags.addAirportPickup) quote.totalAmount += 1500;
  }
  return quote;
}

export async function runTravelManager(
  input: TravelManagerInput
): Promise<TravelManagerResponse> {
  const locale = input.locale ?? "hi";
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
  let packageQuote: CustomPackageQuote | undefined;
  let packageTiers: TierPackageQuote[] | undefined;
  let hotels = undefined;
  let vehicles = undefined;

  if (
    newState.step === "package_tiers" &&
    newState.destination &&
    newState.durationDays
  ) {
    packageTiers = await buildTierPackages(tierBuildInput(newState, locale));
    reply =
      locale === "hi"
        ? `✨ ${newState.destination} के लिए 4 पैकेज तैयार हैं!\n\nबजट से लक्ज़री — सभी कीमतें लाइव हैं।\n\nपसंदीदा पैकेज चुनें:`
        : `✨ 4 packages ready for ${newState.destination}!\n\nBudget to Luxury — all live prices.\n\nSelect your package:`;
    quickReplies = packageTiers.map((p) => ({
      id: `tier-${p.tierId}`,
      label: `${p.tierLabel} · ₹${p.totalAmount.toLocaleString("en-IN")}`,
      value: `select_tier:${p.tierId}`,
    }));
  }

  if (
    (newState.step === "package_review" || newState.step === "customize") &&
    newState.destination &&
    newState.durationDays
  ) {
    packageTiers = await buildTierPackages(tierBuildInput(newState, locale));
    packageQuote = await resolvePackageQuote(newState, packageTiers, locale);
    if (packageQuote && newState.step === "package_review") {
      reply =
        locale === "hi"
          ? `📦 ${packageQuote.title}\n\n🗓 ${packageQuote.durationDays} दिन | 👥 ${packageQuote.guests} मेहमान\n${packageQuote.hotel ? `🏨 ${packageQuote.hotel.name} (${packageQuote.hotel.starRating}★)\n` : ""}${packageQuote.vehicle ? `🚗 ${packageQuote.vehicle.name}\n` : ""}🎯 ${packageQuote.activities.map((a) => a.name).join(", ") || "Sightseeing"}\n🍽 ${packageQuote.meals.join(", ")}\n📍 ${packageQuote.pickup}\n\n💰 कुल: ₹${packageQuote.totalAmount.toLocaleString("en-IN")}`
          : `📦 ${packageQuote.title}\n\n🗓 ${packageQuote.durationDays} days | 👥 ${packageQuote.guests} guests\n${packageQuote.hotel ? `🏨 ${packageQuote.hotel.name} (${packageQuote.hotel.starRating}★)\n` : ""}${packageQuote.vehicle ? `🚗 ${packageQuote.vehicle.name}\n` : ""}🎯 ${packageQuote.activities.map((a) => a.name).join(", ")}\n🍽 ${packageQuote.meals.join(", ")}\n📍 Pickup: ${packageQuote.pickup}\n\n💰 Total: ₹${packageQuote.totalAmount.toLocaleString("en-IN")}`;
      quickReplies = [
        { id: "book", label: locale === "hi" ? "Book Now 📅" : "Book Now 📅", value: "book_package" },
        { id: "customize", label: locale === "hi" ? "Customize" : "Customize", value: "__customize__" },
        { id: "human", label: locale === "hi" ? "Talk To Human" : "Talk To Human", value: "__human__" },
      ];
    }
  }

  if (newState.step === "hotel_results" && newState.destination) {
    hotels = await searchHotelsForDestination(newState.destination, newState.hotelBudgetTier);
    if (hotels.length === 0) {
      reply =
        locale === "hi"
          ? "कोई होटल नहीं मिला। दूसरा शहर आज़माएं।"
          : "No hotels found. Try another city.";
    }
  }

  if (newState.step === "vehicle_results" && newState.guests) {
    vehicles = await searchVehiclesForGuests(newState.guests);
  }

  const context = packageQuote
    ? `Package ₹${packageQuote.totalAmount}`
    : packageTiers
      ? `${packageTiers.length} tiers`
      : hotels
        ? `${hotels.length} hotels`
        : vehicles
          ? `${vehicles.length} vehicles`
          : newState.destination ?? "";

  const skipEnrich = newState.step === "package_tiers" || newState.step === "package_review";
  const enriched = skipEnrich
    ? { reply, provider: "rule-based" as const }
    : await enrichReplyWithAi(reply, input.message, locale, context);

  return {
    reply: enriched.reply,
    locale,
    state: newState,
    quickReplies,
    packageQuote,
    packageTiers,
    hotels,
    vehicles,
    provider: enriched.provider,
  };
}
