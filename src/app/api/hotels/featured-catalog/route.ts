import { NextResponse } from "next/server";
import { getFeaturedTripJackHotels } from "@/lib/tripjack-hotels/featured-catalog";
import { getHotelWebsiteSettings, isTripjackHotelsWebsiteEnabled } from "@/lib/hotels/website-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const settings = await getHotelWebsiteSettings();
    if (!isTripjackHotelsWebsiteEnabled(settings)) {
      return NextResponse.json({ success: true, data: { hotels: [] } });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(30, Math.max(1, Number(searchParams.get("limit") ?? 24) || 24));
    const hotels = await getFeaturedTripJackHotels(limit);

    return NextResponse.json({ success: true, data: { hotels } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load featured hotels";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
