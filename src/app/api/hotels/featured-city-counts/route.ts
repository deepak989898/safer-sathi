import { NextResponse } from "next/server";
import { getTripJackHotelCityFilterStats } from "@/lib/tripjack-hotels/catalog-firestore";
import { getHotelWebsiteSettings, isTripjackHotelsWebsiteEnabled } from "@/lib/hotels/website-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getHotelWebsiteSettings();
    if (!isTripjackHotelsWebsiteEnabled(settings)) {
      return NextResponse.json({ success: true, data: null });
    }

    const filterCounts = await getTripJackHotelCityFilterStats();
    return NextResponse.json({ success: true, data: filterCounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load city counts";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
