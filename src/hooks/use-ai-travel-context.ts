"use client";

import { useCallback } from "react";
import {
  sanitizeClientContext,
  sanitizeLocalPreferences,
} from "@/lib/ai/travel-manager/api-payload";
import {
  getOrCreateDeviceId,
  getOrCreateGuestId,
  getOrCreateVisitorId,
} from "@/lib/identity/visitor-identity";
import { localeToPreferredLanguage } from "@/lib/ai/travel-manager/geo-language";
import type { AITravelPreferences } from "@/types/travel-manager";
import type { Locale } from "@/types";

const PREFS_KEY = "safar-sathi-ai-preferences";

export { getOrCreateGuestId };

function safeStorageGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing / storage disabled — continue without persistence.
  }
}

function sanitizeAiPreferences(prefs: AITravelPreferences): AITravelPreferences {
  return sanitizeLocalPreferences(prefs) as AITravelPreferences;
}

export function getLocalAiPreferences(): AITravelPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = safeStorageGet(PREFS_KEY);
    if (!raw) return null;
    const sanitized = sanitizeLocalPreferences(JSON.parse(raw) as AITravelPreferences);
    if (!sanitized) return null;
    return {
      preferredLanguage: sanitized.preferredLanguage ?? "hindi",
      ...sanitized,
    };
  } catch {
    return null;
  }
}

export function saveLocalAiPreferences(prefs: AITravelPreferences): void {
  if (typeof window === "undefined") return;
  safeStorageSet(PREFS_KEY, JSON.stringify(sanitizeAiPreferences(prefs)));
}

export function getBrowserHints(): { browserLanguage: string; timezone: string } {
  if (typeof window === "undefined") {
    return { browserLanguage: "en", timezone: "Asia/Kolkata" };
  }
  return {
    browserLanguage: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function useAiTravelContext(userId?: string) {
  const buildClientContext = useCallback(() => {
    const hints = getBrowserHints();
    const visitorId = getOrCreateVisitorId();
    return sanitizeClientContext({
      userId: userId && userId !== "guest" ? userId : undefined,
      guestId: getOrCreateGuestId(),
      visitorId,
      deviceId: getOrCreateDeviceId(),
      browserLanguage: hints.browserLanguage,
      timezone: hints.timezone,
      localPreferences: getLocalAiPreferences(),
    })!;
  }, [userId]);

  const saveLanguagePreference = useCallback((locale: Locale) => {
    const existing = getLocalAiPreferences();
    saveLocalAiPreferences({
      preferredLanguage: localeToPreferredLanguage(locale),
      nativeLanguage: existing?.nativeLanguage,
      preferredBudget: existing?.preferredBudget,
      favouriteDestinations: existing?.favouriteDestinations,
      tripStyle: existing?.tripStyle,
      hotelCategory: existing?.hotelCategory,
      vehiclePreference: existing?.vehiclePreference,
      lastCity: existing?.lastCity,
      lastState: existing?.lastState,
      lastCountry: existing?.lastCountry,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const saveNativeLanguagePreference = useCallback((nativeLanguage: string) => {
    const existing = getLocalAiPreferences();
    saveLocalAiPreferences({
      preferredLanguage: existing?.preferredLanguage ?? "hindi",
      nativeLanguage: nativeLanguage || undefined,
      preferredBudget: existing?.preferredBudget,
      favouriteDestinations: existing?.favouriteDestinations,
      tripStyle: existing?.tripStyle,
      hotelCategory: existing?.hotelCategory,
      vehiclePreference: existing?.vehiclePreference,
      lastCity: existing?.lastCity,
      lastState: existing?.lastState,
      lastCountry: existing?.lastCountry,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  return {
    buildClientContext,
    saveLanguagePreference,
    saveNativeLanguagePreference,
    getLocalAiPreferences,
  };
}
