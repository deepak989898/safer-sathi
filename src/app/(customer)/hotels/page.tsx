import { getHotels } from "@/lib/data-service";
import {
  DEFAULT_HOTEL_WEBSITE_SETTINGS,
  getHotelWebsiteSettings,
  isManualHotelsWebsiteEnabled,
  isTripjackHotelsWebsiteEnabled,
} from "@/lib/hotels/website-settings";
import { getFeaturedTripJackHotels } from "@/lib/tripjack-hotels/featured-catalog";
import { buildPageMetadata } from "@/lib/seo/metadata";
import HotelsClient from "./hotels-client";

// Match packages: always load Firestore hotels at request time (no empty ISR shell).
export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Hotels in India | Book Stays | Safar Sathi",
  description:
    "Browse curated hotels with photos and fixed prices. Book online with Razorpay — pay 10% advance or full amount.",
  path: "/hotels",
  keywords: ["hotels India", "hotel booking", "budget hotels Goa", "Manali hotels"],
});

export default async function HotelsPage() {
  // Firestore may be temporarily unavailable or quota-limited.
  // Never fail the whole page for optional catalog data.
  const websiteSettings = await getHotelWebsiteSettings().catch((error) => {
    console.warn("[hotels-page] website settings unavailable; using defaults:", error);
    return DEFAULT_HOTEL_WEBSITE_SETTINGS;
  });
  const tripjackEnabled = isTripjackHotelsWebsiteEnabled(websiteSettings);
  const manualEnabled = isManualHotelsWebsiteEnabled(websiteSettings);

  const [hotels, featuredTripJackHotels] = await Promise.all([
    manualEnabled
      ? getHotels().catch((error) => {
          console.warn("[hotels-page] manual catalog unavailable:", error);
          return [];
        })
      : Promise.resolve([]),
    tripjackEnabled
      ? getFeaturedTripJackHotels(24).catch((error) => {
          console.warn("[hotels-page] featured catalog unavailable:", error);
          return [];
        })
      : Promise.resolve([]),
  ]);

  return (
    <HotelsClient
      initialHotels={hotels}
      featuredTripJackHotels={featuredTripJackHotels}
      tripjackHotelsEnabled={tripjackEnabled}
      manualHotelsEnabled={manualEnabled}
    />
  );
}
