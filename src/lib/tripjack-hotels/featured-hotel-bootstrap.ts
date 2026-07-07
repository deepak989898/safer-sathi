import { generateHotelCorrelationId } from "@/lib/tripjack-hotels/correlation";
import {
  saveHotelListingSession,
  updateHotelListingStayDetails,
} from "@/lib/tripjack-hotels/session";
import { getDefaultHotelStayDates } from "@/lib/tripjack-hotels/stay-dates";
import type { HotelListingSearchParams } from "@/lib/tripjack-hotels/types";

export async function bootstrapFeaturedTripJackHotel(input: {
  tjHotelId: number;
  hotelName: string;
  cityName?: string;
  location?: string;
  heroImage?: string;
  imageUrls?: string[];
  starRating?: number | null;
  facilities?: string[];
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const destinationLabel = input.cityName?.trim() || input.hotelName;
  const { checkIn, checkOut } = getDefaultHotelStayDates();

  try {
    const pricing = await startHotelLivePricing({
      hid: input.tjHotelId,
      checkIn,
      checkOut,
      rooms: [{ adults: 2 }],
      hotelName: input.hotelName,
      cityName: input.cityName,
      location: input.location,
      heroImage: input.heroImage,
      imageUrls: input.imageUrls,
      starRating: input.starRating,
      facilities: input.facilities,
    });

    if (pricing.ok) {
      return { ok: true };
    }

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
          starRating: input.starRating ?? null,
          heroImage: input.heroImage,
          imageUrls: input.imageUrls ?? [],
          browseOnly: true,
          cheapestTotalPrice: 0,
          cheapestBasePrice: 0,
          cheapestTaxes: 0,
          cheapestMf: 0,
          cheapestMft: 0,
          currency: "INR",
          mealBasis: "",
          inclusions: input.facilities?.slice(0, 3) ?? [],
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
      checkIn,
      checkOut,
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
  cityName?: string;
  location?: string;
  heroImage?: string;
  imageUrls?: string[];
  starRating?: number | null;
  facilities?: string[];
  currency?: string;
  nationality?: string;
}): Promise<
  | { ok: true; correlationId: string }
  | { ok: false; message: string }
> {
  const correlationId = generateHotelCorrelationId();
  const destinationLabel = input.cityName?.trim() || input.hotelName || "Hotel";

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
        destinationLabel,
      }),
    });
    const listingJson = await listingRes.json();
    if (!listingJson.success) {
      return { ok: false, message: listingJson.error ?? "Could not load live rates" };
    }

    const hotels = Array.isArray(listingJson.data?.hotels) ? listingJson.data.hotels : [];
    const listingHotel = hotels[0];

    saveHotelListingSession({
      request: {
        destination: destinationLabel,
        destinationLabel,
        checkIn: input.checkIn,
        checkOut: input.checkOut,
        rooms: input.rooms,
        currency: input.currency ?? "INR",
        nationality: input.nationality ?? "106",
      },
      correlationId: listingJson.data?.correlationId || correlationId,
      hotels: listingHotel
        ? [
            {
              ...listingHotel,
              location: listingHotel.location || input.location || destinationLabel,
              heroImage: listingHotel.heroImage || input.heroImage,
              imageUrls: listingHotel.imageUrls?.length
                ? listingHotel.imageUrls
                : input.imageUrls,
              starRating: listingHotel.starRating ?? input.starRating ?? null,
            },
          ]
        : [],
      totalResults: hotels.length,
      currency: listingJson.data?.currency ?? "INR",
      nationality: input.nationality ?? "106",
      browseMode: false,
    });

    updateHotelListingStayDetails({
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      rooms: input.rooms,
      correlationId: listingJson.data?.correlationId || correlationId,
      currency: input.currency ?? "INR",
      nationality: input.nationality ?? "106",
    });

    return { ok: true, correlationId: listingJson.data?.correlationId || correlationId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load live rates";
    return { ok: false, message };
  }
}
