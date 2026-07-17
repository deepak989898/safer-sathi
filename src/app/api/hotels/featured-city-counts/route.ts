import { NextResponse } from "next/server";
import { getTripJackHotelCityFilterStats } from "@/lib/tripjack-hotels/catalog-firestore";
import { getHotelWebsiteSettings, isTripjackHotelsWebsiteEnabled } from "@/lib/hotels/website-settings";

export const revalidate = 21600;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
};

export async function GET() {
  try {
    const settings = await getHotelWebsiteSettings();
    if (!isTripjackHotelsWebsiteEnabled(settings)) {
      return NextResponse.json(
        { success: true, data: null },
        { headers: CACHE_HEADERS }
      );
    }

    const filterCounts = await getTripJackHotelCityFilterStats();
    return NextResponse.json(
      { success: true, data: filterCounts },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load city counts";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
