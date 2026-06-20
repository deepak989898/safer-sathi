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
  getStepUiForState,
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
  if (
    flags &&
    (flags.removeHotel ||
      flags.removeVehicle ||
      flags.extraNights ||
      flags.addGuide ||
      flags.addAirportPickup)
  ) {
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

function formatPackageReviewReply(quote: CustomPackageQuote, locale: Locale): string {
  return locale === "hi"
    ? `📦 ${quote.title}\n\n🗓 ${quote.durationDays} दिन | 👥 ${quote.guests} मेहमान\n${quote.hotel ? `🏨 ${quote.hotel.name} (${quote.hotel.starRating}★)\n` : ""}${quote.vehicle ? `🚗 ${quote.vehicle.name}\n` : ""}🎯 ${quote.activities.map((a) => a.name).join(", ") || "Sightseeing"}\n🍽 ${quote.meals.join(", ")}\n📍 ${quote.pickup}\n\n💰 कुल: ₹${quote.totalAmount.toLocaleString("en-IN")}`
    : `📦 ${quote.title}\n\n🗓 ${quote.durationDays} days | 👥 ${quote.guests} guests\n${quote.hotel ? `🏨 ${quote.hotel.name} (${quote.hotel.starRating}★)\n` : ""}${quote.vehicle ? `🚗 ${quote.vehicle.name}\n` : ""}🎯 ${quote.activities.map((a) => a.name).join(", ")}\n🍽 ${quote.meals.join(", ")}\n📍 Pickup: ${quote.pickup}\n\n💰 Total: ₹${quote.totalAmount.toLocaleString("en-IN")}`;
}

async function buildStepPayload(
  state: TravelManagerState,
  locale: Locale,
  baseReply?: string,
  baseQuickReplies?: TravelManagerResponse["quickReplies"]
): Promise<Pick<TravelManagerResponse, "reply" | "quickReplies" | "packageQuote" | "packageTiers" | "hotels" | "vehicles">> {
  let reply = baseReply ?? getStepUiForState(state, locale).reply;
  let quickReplies = baseQuickReplies ?? getStepUiForState(state, locale).quickReplies;
  let packageQuote: CustomPackageQuote | undefined;
  let packageTiers: TierPackageQuote[] | undefined;
  let hotels = undefined;
  let vehicles = undefined;

  if (state.step === "package_tiers" && state.destination && state.durationDays) {
    packageTiers = await buildTierPackages(tierBuildInput(state, locale));
    reply =
      locale === "hi"
        ? `✨ ${state.destination} के लिए 4 पैकेज तैयार हैं!\n\nबजट से लक्ज़री — सभी कीमतें लाइव हैं।\n\nपसंदीदा पैकेज चुनें:`
        : `✨ 4 packages ready for ${state.destination}!\n\nBudget to Luxury — all live prices.\n\nSelect your package:`;
    quickReplies = [];
  }

  if (
    (state.step === "package_review" || state.step === "customize") &&
    state.destination &&
    state.durationDays &&
    state.selectedTierId
  ) {
    const tiers = await buildTierPackages(tierBuildInput(state, locale));
    packageQuote = await resolvePackageQuote(state, tiers, locale);
    if (state.step === "package_review" && packageQuote) {
      reply = formatPackageReviewReply(packageQuote, locale);
      quickReplies = [
        { id: "book", label: locale === "hi" ? "Book Now 📅" : "Book Now 📅", value: "book_package" },
        { id: "customize", label: locale === "hi" ? "Customize" : "Customize", value: "__customize__" },
        { id: "human", label: locale === "hi" ? "Talk To Human" : "Talk To Human", value: "__human__" },
      ];
    }
    if (state.step === "customize" && packageQuote) {
      const tierLabel = "tierLabel" in packageQuote ? String((packageQuote as TierPackageQuote).tierLabel) : packageQuote.title;
      reply =
        locale === "hi"
          ? `✏️ कस्टमाइज़ करें — ${tierLabel}\n\n💰 वर्तमान कीमत: ₹${packageQuote.totalAmount.toLocaleString("en-IN")}\n\nनीचे से बदलाव चुनें:`
          : `✏️ Customize — ${tierLabel}\n\n💰 Current price: ₹${packageQuote.totalAmount.toLocaleString("en-IN")}\n\nPick changes below:`;
    }
  }

  if (state.step === "hotel_results" && state.destination) {
    hotels = await searchHotelsForDestination(state.destination, state.hotelBudgetTier);
    if (hotels.length === 0) {
      reply =
        locale === "hi"
          ? "कोई होटल नहीं मिला। दूसरा शहर आज़माएं।"
          : "No hotels found. Try another city.";
    }
  }

  if (state.step === "vehicle_results" && state.guests) {
    vehicles = await searchVehiclesForGuests(state.guests);
  }

  return { reply, quickReplies, packageQuote, packageTiers, hotels, vehicles };
}

export async function runTravelManager(
  input: TravelManagerInput
): Promise<TravelManagerResponse> {
  const locale = input.locale ?? "hi";
  const isInit = !input.message || input.message === "__init__";
  const isRefresh = input.message === "__refresh__";
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

  if (isRefresh && input.state) {
    const ui = getStepUiForState(state, locale);
    const payload = await buildStepPayload(state, locale, ui.reply, ui.quickReplies);
    return {
      locale,
      state,
      provider: "rule-based",
      ...payload,
    };
  }

  const transition = processConversationInput(input.message, state, locale);
  const newState = { ...transition.state, step: transition.nextStep };
  const payload = await buildStepPayload(newState, locale, transition.reply, transition.quickReplies);

  const skipEnrich =
    newState.step === "package_tiers" ||
    newState.step === "package_review" ||
    newState.step === "customize";
  const context = payload.packageQuote
    ? `Package ₹${payload.packageQuote.totalAmount}`
    : payload.packageTiers
      ? `${payload.packageTiers.length} tiers`
      : newState.destination ?? "";

  const enriched = skipEnrich
    ? { reply: payload.reply, provider: "rule-based" as const }
    : await enrichReplyWithAi(payload.reply, input.message, locale, context);

  return {
    reply: enriched.reply,
    locale,
    state: newState,
    quickReplies: payload.quickReplies,
    packageQuote: payload.packageQuote,
    packageTiers: payload.packageTiers,
    hotels: payload.hotels,
    vehicles: payload.vehicles,
    provider: enriched.provider,
  };
}
