import { HotelSearchClient } from "@/components/hotels-tripjack/hotel-search-client";
import {
  DEFAULT_HOTEL_WEBSITE_SETTINGS,
  getHotelWebsiteSettings,
  isTripjackHotelsWebsiteEnabled,
} from "@/lib/hotels/website-settings";
import Link from "next/link";

export const metadata = {
  title: "Search Hotels | Safar Sathi",
  description: "Search live hotels with TripJack",
};

export default async function HotelSearchPage() {
  // Do not let a temporary Firestore quota outage abort static generation.
  // The default keeps live search visible; its APIs handle runtime failures.
  const settings = await getHotelWebsiteSettings().catch((error) => {
    console.warn("[hotel-search-page] settings unavailable; using defaults:", error);
    return DEFAULT_HOTEL_WEBSITE_SETTINGS;
  });
  const enabled = isTripjackHotelsWebsiteEnabled(settings);

  if (!enabled) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-[#0c2444]">Live hotel search unavailable</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          TripJack live hotel booking is temporarily hidden by the administrator.
        </p>
        <Link href="/hotels" className="mt-6 inline-block font-semibold text-[#1a4fa3] hover:underline">
          Browse curated hotels
        </Link>
      </div>
    );
  }

  return <HotelSearchClient />;
}
