import {
  localeToPreferredLanguage,
  mergePreferences,
  memoryFromState,
  preferredLanguageToLocale,
  resolveAiLocale,
} from "@/lib/ai/travel-manager/geo-language";
import { resolveUserLocation } from "@/lib/ai/travel-manager/ip-geolocation";
import {
  getGuestAiPreferences,
  getUserAiPreferences,
  saveGuestAiPreferences,
  saveUserAiPreferences,
} from "@/lib/ai/travel-manager/preferences-service";
import type { Locale } from "@/types";
import type { AITravelPreferences, TravelManagerResponse, UserLocationInfo } from "@/types/travel-manager";

export interface TravelManagerClientContext {
  userId?: string;
  guestId?: string;
  browserLanguage?: string;
  timezone?: string;
  localPreferences?: Partial<AITravelPreferences> | null;
}

export interface InitContextResult {
  location: UserLocationInfo;
  locale: Locale;
  preferences: AITravelPreferences;
}

export async function buildInitContext(
  request: Request,
  clientContext?: TravelManagerClientContext,
  forceLocale?: Locale
): Promise<InitContextResult> {
  const location = await resolveUserLocation(
    request,
    {
      browserLanguage: clientContext?.browserLanguage,
      timezone: clientContext?.timezone,
    },
    { ipTimeoutMs: 400 }
  );

  let savedPrefs: AITravelPreferences | null = null;
  if (clientContext?.userId && clientContext.userId !== "guest") {
    savedPrefs = await getUserAiPreferences(clientContext.userId);
  } else if (clientContext?.guestId) {
    savedPrefs = await getGuestAiPreferences(clientContext.guestId);
  }

  const localPrefs = clientContext?.localPreferences;
  const savedPreference =
    forceLocale !== undefined
      ? localeToPreferredLanguage(forceLocale)
      : localPrefs?.preferredLanguage ?? savedPrefs?.preferredLanguage ?? null;

  const locale =
    forceLocale ??
    resolveAiLocale({
      savedPreference,
      browserLanguage: clientContext?.browserLanguage,
      location,
    });

  const preferences = mergePreferences(savedPrefs ?? undefined, {
    ...(localPrefs ?? {}),
    preferredLanguage: localeToPreferredLanguage(locale),
    lastCity: location.city,
    lastState: location.state,
    lastCountry: location.country,
  });

  return { location, locale, preferences };
}

export async function persistAiMemory(
  clientContext: TravelManagerClientContext | undefined,
  result: TravelManagerResponse
): Promise<void> {
  if (!clientContext) return;

  const updates = memoryFromState(result.state, result.locale);
  if (result.state.userLocation?.city) updates.lastCity = result.state.userLocation.city;
  if (result.state.userLocation?.state) updates.lastState = result.state.userLocation.state;

  let existing: AITravelPreferences | null = null;
  if (clientContext.userId && clientContext.userId !== "guest") {
    existing = await getUserAiPreferences(clientContext.userId);
  } else if (clientContext.guestId) {
    existing = await getGuestAiPreferences(clientContext.guestId);
  }

  const preferences = mergePreferences(existing ?? undefined, updates);

  if (clientContext.userId && clientContext.userId !== "guest") {
    await saveUserAiPreferences(clientContext.userId, preferences);
  } else if (clientContext.guestId) {
    await saveGuestAiPreferences(clientContext.guestId, preferences);
  }
}

export { preferredLanguageToLocale };
