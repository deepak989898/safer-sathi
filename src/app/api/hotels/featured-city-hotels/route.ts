import { NextResponse } from "next/server";
import { getFeaturedCityHotelsPaged } from "@/lib/tripjack-hotels/featured-catalog";
import { getHotelWebsiteSettings, isTripjackHotelsWebsiteEnabled } from "@/lib/hotels/website-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const settings = await getHotelWebsiteSettings();
    if (!isTripjackHotelsWebsiteEnabled(settings)) {
      return NextResponse.json({ success: true, data: { hotels: [], totalCount: 0, totalPages: 1, page: 1 } });
    }

    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city")?.trim() ?? "";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize") ?? 20) || 20));

    if (!city) {
      return NextResponse.json({ success: false, error: "city is required" }, { status: 400 });
    }

    const result = await getFeaturedCityHotelsPaged({ cityKey: city, page, pageSize });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load city hotels";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
