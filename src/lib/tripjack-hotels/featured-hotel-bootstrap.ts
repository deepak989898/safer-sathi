import { generateHotelCorrelationId } from "@/lib/tripjack-hotels/correlation";
import { saveHotelListingSession } from "@/lib/tripjack-hotels/session";
import type { HotelListingSearchParams } from "@/lib/tripjack-hotels/types";

function defaultFeaturedDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 14);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}

export async function bootstrapFeaturedTripJackHotel(input: {
  tjHotelId: number;
  hotelName: string;
  cityName?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const dates = defaultFeaturedDates();
  const correlationId = generateHotelCorrelationId();
  const destinationLabel = input.cityName?.trim() || input.hotelName;

  const params: HotelListingSearchParams = {
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    rooms: [{ adults: 2 }],
    currency: "INR",
    nationality: "106",
    destination: destinationLabel,
    destinationLabel,
    correlationId,
  };

  try {
    const res = await fetch("/api/hotels/listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        hids: [input.tjHotelId],
      }),
    });
    const json = await res.json();
    if (!json.success) {
      return { ok: false, message: json.error ?? "Could not load live rates for this hotel" };
    }

    const hotels = json.data?.hotels ?? [];
    if (!hotels.length) {
      return {
        ok: false,
        message: json.data?.message ?? "No live rates found. Try different dates from search.",
      };
    }

    saveHotelListingSession({
      request: params,
      correlationId: json.data.correlationId ?? correlationId,
      hotels,
      totalResults: json.data.totalResults ?? hotels.length,
      currency: json.data.currency ?? "INR",
      nationality: json.data.nationality ?? "106",
    });

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load live rates";
    return { ok: false, message };
  }
}
