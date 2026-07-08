import "server-only";

import { getSafeAdminDb, isAdminEnvConfigured } from "@/lib/firebase/admin-safe";

export const HOTEL_WEBSITE_SETTINGS_DOC = "siteSettings/hotels";

export interface HotelWebsiteSettings {
  /** Show manually added hotels on /hotels catalog */
  manualHotelsWebsiteEnabled: boolean;
  /** Show TripJack live search/booking flow on website */
  tripjackHotelsWebsiteEnabled: boolean;
  /** Optional % markup on TripJack hotel room totals (0 = show API price only) */
  hotelMarkupPercent: number;
  updatedAt: string;
}

export const DEFAULT_HOTEL_WEBSITE_SETTINGS: HotelWebsiteSettings = {
  manualHotelsWebsiteEnabled: true,
  tripjackHotelsWebsiteEnabled: true,
  hotelMarkupPercent: 0,
  updatedAt: new Date().toISOString(),
};

export async function getHotelWebsiteSettings(): Promise<HotelWebsiteSettings> {
  if (!isAdminEnvConfigured()) return DEFAULT_HOTEL_WEBSITE_SETTINGS;
  const db = await getSafeAdminDb();
  if (!db) return DEFAULT_HOTEL_WEBSITE_SETTINGS;

  const snap = await db.doc(HOTEL_WEBSITE_SETTINGS_DOC).get();
  if (!snap.exists) return DEFAULT_HOTEL_WEBSITE_SETTINGS;
  return { ...DEFAULT_HOTEL_WEBSITE_SETTINGS, ...(snap.data() as HotelWebsiteSettings) };
}

export async function updateHotelWebsiteSettings(
  patch: Partial<
    Pick<
      HotelWebsiteSettings,
      "manualHotelsWebsiteEnabled" | "tripjackHotelsWebsiteEnabled" | "hotelMarkupPercent"
    >
  >
): Promise<HotelWebsiteSettings> {
  const current = await getHotelWebsiteSettings();
  const next: HotelWebsiteSettings = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (!isAdminEnvConfigured()) return next;
  const db = await getSafeAdminDb();
  if (!db) return next;

  await db.doc(HOTEL_WEBSITE_SETTINGS_DOC).set(next, { merge: true });
  return next;
}

export function isManualHotelsWebsiteEnabled(settings = DEFAULT_HOTEL_WEBSITE_SETTINGS): boolean {
  return settings.manualHotelsWebsiteEnabled !== false;
}

export function isTripjackHotelsWebsiteEnabled(settings = DEFAULT_HOTEL_WEBSITE_SETTINGS): boolean {
  return settings.tripjackHotelsWebsiteEnabled !== false;
}
