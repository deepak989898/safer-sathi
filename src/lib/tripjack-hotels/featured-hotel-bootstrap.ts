import { generateHotelCorrelationId } from "@/lib/tripjack-hotels/correlation";
import {
  saveHotelListingSession,
  updateHotelListingStayDetails,
} from "@/lib/tripjack-hotels/session";
import type { HotelListingSearchParams } from "@/lib/tripjack-hotels/types";

export async function bootstrapFeaturedTripJackHotel(input: {
  tjHotelId: number;
  hotelName: string;
  cityName?: string;
  location?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const destinationLabel = input.cityName?.trim() || input.hotelName;

  try {
    const res = await fetch("/api/hotels/catalog-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hids: [input.tjHotelId],
        limit: 1,
      }),
    });
    const json = await res.json();

    let hotels = json.success ? json.data?.hotels ?? [] : [];
    if (!hotels.length) {
      hotels = [
        {
          tjHotelId: input.tjHotelId,
          name: input.hotelName,
          location: input.location || destinationLabel,
          browseOnly: true,
          cheapestTotalPrice: 0,
          cheapestBasePrice: 0,
          cheapestTaxes: 0,
          cheapestMf: 0,
          cheapestMft: 0,
          currency: "INR",
          mealBasis: "",
          inclusions: [],
          isRefundable: false,
          panRequired: false,
          passportRequired: false,
          options: [],
          cheapestOption: null,
          hasBreakfast: false,
        },
      ];
    }

    const request: HotelListingSearchParams = {
      destination: destinationLabel,
      destinationLabel,
      browseMode: true,
      rooms: [{ adults: 2 }],
      currency: "INR",
      nationality: "106",
    };

    saveHotelListingSession({
      request,
      correlationId: "",
      hotels,
      totalResults: hotels.length,
      currency: "INR",
      nationality: "106",
      browseMode: true,
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not open hotel";
    return { ok: false, message };
  }
}

export async function startHotelLivePricing(input: {
  hid: string | number;
  checkIn: string;
  checkOut: string;
  rooms: HotelListingSearchParams["rooms"];
  hotelName?: string;
  currency?: string;
  nationality?: string;
}): Promise<
  | { ok: true; correlationId: string }
  | { ok: false; message: string }
> {
  const correlationId = generateHotelCorrelationId();

  try {
    const listingRes = await fetch("/api/hotels/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        rooms: input.rooms,
        currency: input.currency ?? "INR",
        nationality: input.nationality ?? "106",
        correlationId,
        hids: [Number(input.hid)],
        destinationLabel: input.hotelName,
      }),
    });
    const listingJson = await listingRes.json();
    if (!listingJson.success) {
      return { ok: false, message: listingJson.error ?? "Could not load live rates" };
    }

    updateHotelListingStayDetails({
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      rooms: input.rooms,
      correlationId,
      currency: input.currency ?? "INR",
      nationality: input.nationality ?? "106",
    });

    return { ok: true, correlationId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load live rates";
    return { ok: false, message };
  }
}
