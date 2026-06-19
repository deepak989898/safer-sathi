"use client";

import { useCallback } from "react";
import type { AITravelPreferences } from "@/types/travel-manager";
import { localeToPreferredLanguage } from "@/lib/ai/travel-manager/geo-language";
import type { Locale } from "@/types";

const GUEST_ID_KEY = "safar-sathi-ai-guest-id";
const PREFS_KEY = "safar-sathi-ai-preferences";

export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function getLocalAiPreferences(): AITravelPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as AITravelPreferences) : null;
  } catch {
    return null;
  }
}

export function saveLocalAiPreferences(prefs: AITravelPreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
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
    return {
      userId: userId && userId !== "guest" ? userId : undefined,
      guestId: getOrCreateGuestId(),
      browserLanguage: hints.browserLanguage,
      timezone: hints.timezone,
      localPreferences: getLocalAiPreferences(),
    };
  }, [userId]);

  const saveLanguagePreference = useCallback((locale: Locale) => {
    const existing = getLocalAiPreferences();
    saveLocalAiPreferences({
      preferredLanguage: localeToPreferredLanguage(locale),
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

  return { buildClientContext, saveLanguagePreference, getLocalAiPreferences };
}
