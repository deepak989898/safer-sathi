import { getHotels } from "@/lib/data-service";
import { getHotelWebsiteSettings } from "@/lib/hotels/website-settings";
import { getFeaturedTripJackHotels } from "@/lib/tripjack-hotels/featured-catalog";
import { buildPageMetadata } from "@/lib/seo/metadata";
import HotelsClient from "./hotels-client";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Hotels in India | Book Stays | Safar Sathi",
  description:
    "Find and book hotels across India — budget to luxury stays in Manali, Goa, Delhi, Jaipur and more.",
  path: "/hotels",
  keywords: ["hotels India", "hotel booking", "budget hotels Goa", "Manali hotels"],
});

export default async function HotelsPage() {
  const websiteSettings = await getHotelWebsiteSettings();
  const tripjackEnabled = websiteSettings.tripjackHotelsWebsiteEnabled !== false;

  const [hotels, featuredTripJackHotels] = await Promise.all([
    getHotels(),
    tripjackEnabled ? getFeaturedTripJackHotels(24) : Promise.resolve([]),
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
