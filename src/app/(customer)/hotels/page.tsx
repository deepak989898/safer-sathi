import { getHotels } from "@/lib/data-service";
import {
  DEFAULT_HOTEL_WEBSITE_SETTINGS,
  getHotelWebsiteSettings,
} from "@/lib/hotels/website-settings";
import { getFeaturedTripJackHotels } from "@/lib/tripjack-hotels/featured-catalog";
import { buildPageMetadata } from "@/lib/seo/metadata";
import HotelsClient from "./hotels-client";

// Cache the catalog shell and featured cards briefly. Live availability and
// prices still load through their APIs for the dates selected by the user.
export const revalidate = 300;

export const metadata = buildPageMetadata({
  title: "Hotels in India | Book Stays | Safar Sathi",
  description:
    "Find and book hotels across India — budget to luxury stays in Manali, Goa, Delhi, Jaipur and more.",
  path: "/hotels",
  keywords: ["hotels India", "hotel booking", "budget hotels Goa", "Manali hotels"],
});

export default async function HotelsPage() {
  // Firestore may be temporarily unavailable or quota-limited during a Vercel
  // build. Never fail the whole deployment for optional catalog data.
  const websiteSettings = await getHotelWebsiteSettings().catch((error) => {
    console.warn("[hotels-page] website settings unavailable; using defaults:", error);
    return DEFAULT_HOTEL_WEBSITE_SETTINGS;
  });
  const tripjackEnabled = websiteSettings.tripjackHotelsWebsiteEnabled !== false;

  const [hotels, featuredTripJackHotels] = await Promise.all([
    getHotels().catch((error) => {
      console.warn("[hotels-page] manual catalog unavailable during prerender:", error);
      return [];
    }),
    tripjackEnabled
      ? getFeaturedTripJackHotels(24).catch((error) => {
          console.warn("[hotels-page] featured catalog unavailable during prerender:", error);
          return [];
        })
      : Promise.resolve([]),
  ]);

  return (
    <HotelsClient
      initialHotels={hotels}
      featuredTripJackHotels={featuredTripJackHotels}
      tripjackHotelsEnabled={tripjackEnabled}
      manualHotelsEnabled={websiteSettings.manualHotelsWebsiteEnabled !== false}
    />
  );
}
