import { NextResponse } from "next/server";
import { listTripJackHotels } from "@/lib/tripjack-hotels/client";
import { generateHotelCorrelationId } from "@/lib/tripjack-hotels/correlation";
import { DEFAULT_HOTEL_CURRENCY, DEFAULT_HOTEL_NATIONALITY, isTripJackHotelProviderEnabled } from "@/lib/tripjack-hotels/config";
import { getDefaultHotelSearchDates } from "@/lib/tripjack-hotels/default-search-dates";
import { getRelatedTripJackCatalogHotels } from "@/lib/tripjack-hotels/related-hotels";
import { getHotelWebsiteSettings, isTripjackHotelsWebsiteEnabled } from "@/lib/hotels/website-settings";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const settings = await getHotelWebsiteSettings();
    if (!isTripjackHotelsWebsiteEnabled(settings)) {
      return NextResponse.json({ success: true, data: { hotels: [] } });
    }

    const { searchParams } = new URL(request.url);
    const excludeHid = Number(searchParams.get("excludeHid") ?? 0);
    const cityName = searchParams.get("city")?.trim() ?? "";
    const starRating = searchParams.get("stars") ? Number(searchParams.get("stars")) : null;
    const checkIn = searchParams.get("checkIn") ?? getDefaultHotelSearchDates().checkIn;
    const checkOut = searchParams.get("checkOut") ?? getDefaultHotelSearchDates().checkOut;
    const limit = Math.min(6, Math.max(1, Number(searchParams.get("limit") ?? 6) || 6));

    if (!excludeHid) {
      return NextResponse.json({ success: false, error: "excludeHid is required" }, { status: 400 });
    }

    let hotels = await getRelatedTripJackCatalogHotels({
      cityName,
      starRating,
      excludeHid,
      limit,
    });

    if (isTripJackHotelProviderEnabled() && hotels.length > 0) {
      try {
        const listing = await listTripJackHotels({
          checkIn,
          checkOut,
          rooms: [{ adults: 2 }],
          currency: DEFAULT_HOTEL_CURRENCY,
          nationality: DEFAULT_HOTEL_NATIONALITY,
          correlationId: generateHotelCorrelationId(),
          hids: hotels.map((h) => h.tjHotelId),
        });

        const priceMap = new Map(
          listing.hotels.map((h) => [Number(h.tjHotelId), h.cheapestTotalPrice])
        );

        hotels = hotels.map((hotel) => ({
          ...hotel,
          cheapestTotalPrice: priceMap.get(hotel.tjHotelId),
          currency: listing.currency || DEFAULT_HOTEL_CURRENCY,
        }));
      } catch {
        // catalog-only fallback
      }
    }

    return NextResponse.json({
      success: true,
      data: { hotels, checkIn, checkOut },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load related hotels";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
