import { NextResponse } from "next/server";
import { getRelatedTripJackHotels } from "@/lib/tripjack-hotels/featured-catalog";
import { getHotelWebsiteSettings, isTripjackHotelsWebsiteEnabled } from "@/lib/hotels/website-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const settings = await getHotelWebsiteSettings();
    if (!isTripjackHotelsWebsiteEnabled(settings)) {
      return NextResponse.json({ success: true, data: { hotels: [] } });
    }

    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city")?.trim() ?? "";
    const hid = Number(searchParams.get("hid"));
    const stars = searchParams.get("stars");
    const limit = Math.min(8, Math.max(1, Number(searchParams.get("limit") ?? 6) || 6));

    if (!city || !Number.isFinite(hid)) {
      return NextResponse.json({ success: false, error: "city and hid are required" }, { status: 400 });
    }

    const hotels = await getRelatedTripJackHotels(
      city,
      hid,
      stars != null && stars !== "" ? Number(stars) : null,
      limit
    );

    return NextResponse.json({ success: true, data: { hotels } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load related hotels";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
