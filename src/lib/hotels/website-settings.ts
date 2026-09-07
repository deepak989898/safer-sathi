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
  /** Off by default — customer Hotels use curated Firestore + Razorpay like packages */
  tripjackHotelsWebsiteEnabled: false,
  hotelMarkupPercent: 0,
  updatedAt: new Date().toISOString(),
};

export async function getHotelWebsiteSettings(): Promise<HotelWebsiteSettings> {
  if (!isAdminEnvConfigured()) return DEFAULT_HOTEL_WEBSITE_SETTINGS;
  const db = await getSafeAdminDb();
  if (!db) return DEFAULT_HOTEL_WEBSITE_SETTINGS;

  const snap = await db.doc(HOTEL_WEBSITE_SETTINGS_DOC).get();
  const merged: HotelWebsiteSettings = snap.exists
    ? { ...DEFAULT_HOTEL_WEBSITE_SETTINGS, ...(snap.data() as HotelWebsiteSettings) }
    : DEFAULT_HOTEL_WEBSITE_SETTINGS;

  // Live TripJack on website only when explicitly opted in via env.
  // Accept either flag so Vercel setup matches common deploy checklists.
  const liveHotelsOptIn =
    process.env.NEXT_PUBLIC_ENABLE_LIVE_HOTELS === "true" ||
    process.env.NEXT_PUBLIC_TRIPJACK_HOTELS_ENABLED === "true";
  if (!liveHotelsOptIn) {
    merged.tripjackHotelsWebsiteEnabled = false;
    // Never blank /hotels when live TripJack is off — always show Firestore catalog.
    merged.manualHotelsWebsiteEnabled = true;
  }

  return merged;
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
  // Opt-in only. Curated /hotels/[slug] booking (package-style) is the default path.
  if (process.env.NEXT_PUBLIC_TRIPJACK_HOTELS_ENABLED === "false") return false;
  const liveHotelsOptIn =
    process.env.NEXT_PUBLIC_ENABLE_LIVE_HOTELS === "true" ||
    process.env.NEXT_PUBLIC_TRIPJACK_HOTELS_ENABLED === "true";
  if (!liveHotelsOptIn) return false;
  return settings.tripjackHotelsWebsiteEnabled === true;
}
