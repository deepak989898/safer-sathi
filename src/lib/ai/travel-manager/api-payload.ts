import { initialTravelManagerState } from "@/lib/ai/travel-manager/conversation-engine";
import type { AITravelPreferences, TravelManagerState } from "@/types/travel-manager";

export function normalizePreferredLanguage(
  value: unknown
): AITravelPreferences["preferredLanguage"] | undefined {
  if (value === "hindi" || value === "hi") return "hindi";
  if (value === "english" || value === "en") return "english";
  return undefined;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return undefined;
}

export function sanitizeLocalPreferences(
  prefs: Partial<AITravelPreferences> | null | undefined
): Partial<AITravelPreferences> | undefined {
  if (!prefs || typeof prefs !== "object") return undefined;

  const preferredLanguage = normalizePreferredLanguage(prefs.preferredLanguage);
  const preferredBudget = toOptionalNumber(prefs.preferredBudget);
  const favouriteDestinations = toStringArray(prefs.favouriteDestinations);

  return {
    ...prefs,
    ...(preferredLanguage ? { preferredLanguage } : {}),
    ...(preferredBudget !== undefined ? { preferredBudget } : {}),
    ...(favouriteDestinations ? { favouriteDestinations } : {}),
    ...(typeof prefs.nativeLanguage === "string" ? { nativeLanguage: prefs.nativeLanguage } : {}),
    ...(typeof prefs.tripStyle === "string" ? { tripStyle: prefs.tripStyle } : {}),
    ...(typeof prefs.hotelCategory === "string" ? { hotelCategory: prefs.hotelCategory } : {}),
    ...(typeof prefs.vehiclePreference === "string"
      ? { vehiclePreference: prefs.vehiclePreference }
      : {}),
    ...(typeof prefs.lastCity === "string" ? { lastCity: prefs.lastCity } : {}),
    ...(typeof prefs.lastState === "string" ? { lastState: prefs.lastState } : {}),
    ...(typeof prefs.lastCountry === "string" ? { lastCountry: prefs.lastCountry } : {}),
  };
}

export interface TravelManagerClientContext {
  userId?: string;
  guestId?: string;
  visitorId?: string;
  deviceId?: string;
  browserLanguage?: string;
  timezone?: string;
  localPreferences?: Partial<AITravelPreferences> | null;
}

export function sanitizeClientContext(
  context: TravelManagerClientContext | undefined
): TravelManagerClientContext | undefined {
  if (!context || typeof context !== "object") return undefined;

  const visitorId =
    typeof context.visitorId === "string"
      ? context.visitorId
      : typeof context.guestId === "string"
        ? context.guestId
        : undefined;

  return {
    userId: typeof context.userId === "string" ? context.userId : undefined,
    guestId: typeof context.guestId === "string" ? context.guestId : visitorId,
    visitorId,
    deviceId: typeof context.deviceId === "string" ? context.deviceId : undefined,
    browserLanguage:
      typeof context.browserLanguage === "string" ? context.browserLanguage : undefined,
    timezone: typeof context.timezone === "string" ? context.timezone : undefined,
    localPreferences: sanitizeLocalPreferences(context.localPreferences ?? undefined),
  };
}

export function sanitizeTravelManagerState(
  state: Partial<TravelManagerState> | undefined
): TravelManagerState | undefined {
  if (!state || typeof state !== "object") return undefined;

  const base = initialTravelManagerState();
  const guests = toOptionalNumber(state.guests);
  const budget = toOptionalNumber(state.budget);
  const durationDays = toOptionalNumber(state.durationDays);

  return {
    ...base,
    ...state,
    step: (typeof state.step === "string" ? state.step : base.step) as TravelManagerState["step"],
    intent: (typeof state.intent === "string" ? state.intent : base.intent) as TravelManagerState["intent"],
    selectedActivities: Array.isArray(state.selectedActivities)
      ? state.selectedActivities.filter((item): item is string => typeof item === "string")
      : base.selectedActivities,
    customizeFlags:
      state.customizeFlags && typeof state.customizeFlags === "object"
        ? state.customizeFlags
        : base.customizeFlags,
    ...(guests !== undefined ? { guests } : {}),
    ...(budget !== undefined ? { budget } : {}),
    ...(durationDays !== undefined ? { durationDays } : {}),
  };
}

export function preprocessManagerRequestBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const next = { ...(body as Record<string, unknown>) };

  if (next.context) {
    next.context = sanitizeClientContext(next.context as TravelManagerClientContext);
  }

  if (next.state) {
    next.state = sanitizeTravelManagerState(next.state as Partial<TravelManagerState>);
  }

  return next;
}
