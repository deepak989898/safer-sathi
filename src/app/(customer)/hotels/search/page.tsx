import { HotelSearchClient } from "@/components/hotels-tripjack/hotel-search-client";
import { getHotelWebsiteSettings, isTripjackHotelsWebsiteEnabled } from "@/lib/hotels/website-settings";
import Link from "next/link";

export const metadata = {
  title: "Search Hotels | Safar Sathi",
  description: "Search live hotels with TripJack",
};

export default async function HotelSearchPage() {
  const settings = await getHotelWebsiteSettings();
  const enabled = isTripjackHotelsWebsiteEnabled(settings);

  if (!enabled) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-[#0c2444]">Live hotel search unavailable</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Live hotel booking is temporarily hidden by the administrator.
        </p>
        <Link href="/hotels" className="mt-6 inline-block font-semibold text-[#1a4fa3] hover:underline">
          Browse curated hotels
        </Link>
      </div>
    );
  }

  return <HotelSearchClient />;
}
