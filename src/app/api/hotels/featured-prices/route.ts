import "server-only";

import { z } from "zod";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import {
  buildHotelListingBody,
  listTripJackHotels,
  TripJackHotelApiError,
} from "@/lib/tripjack-hotels/client";
import { DEFAULT_HOTEL_CURRENCY, DEFAULT_HOTEL_NATIONALITY } from "@/lib/tripjack-hotels/config";
import { getDefaultHotelStayDates } from "@/lib/tripjack-hotels/stay-dates";
import {
  getHotelWebsiteSettings,
  isTripjackHotelsWebsiteEnabled,
} from "@/lib/hotels/website-settings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_TTL_MS = 15 * 60 * 1000;
const priceCache = new Map<string, { price: number; currency: string; expiresAt: number }>();

const schema = z.object({
  hids: z.array(z.number().int().positive()).min(1).max(30),
});

function cacheKey(hid: number, checkIn: string, checkOut: string): string {
  return `${hid}:${checkIn}:${checkOut}`;
}

export async function POST(request: Request) {
  try {
    const settings = await getHotelWebsiteSettings();
    if (!isTripjackHotelsWebsiteEnabled(settings)) {
      return apiError("Live hotel pricing is temporarily unavailable", 503);
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const { checkIn, checkOut } = getDefaultHotelStayDates();
    const now = Date.now();
    const prices: Record<string, { price: number; currency: string } | null> = {};
    const missing: number[] = [];

    for (const hid of parsed.data.hids) {
      const key = cacheKey(hid, checkIn, checkOut);
      const cached = priceCache.get(key);
      if (cached && cached.expiresAt > now) {
        prices[String(hid)] = { price: cached.price, currency: cached.currency };
      } else {
        missing.push(hid);
      }
    }

    if (missing.length) {
      const rooms = [{ adults: 2 }];
      const listingBody = buildHotelListingBody({
        checkIn,
        checkOut,
        rooms,
        currency: DEFAULT_HOTEL_CURRENCY,
        nationality: DEFAULT_HOTEL_NATIONALITY,
        hids: missing,
      });

      try {
        const listing = await listTripJackHotels(listingBody);
        const byHid = new Map(
          listing.hotels.map((hotel) => [String(hotel.tjHotelId), hotel.cheapestTotalPrice])
        );

        for (const hid of missing) {
          const total = byHid.get(String(hid)) ?? 0;
          if (total > 0) {
            const value = { price: total, currency: listing.currency || DEFAULT_HOTEL_CURRENCY };
            prices[String(hid)] = value;
            priceCache.set(cacheKey(hid, checkIn, checkOut), {
              ...value,
              expiresAt: now + CACHE_TTL_MS,
            });
          } else {
            prices[String(hid)] = null;
          }
        }
      } catch (err) {
        console.warn("[featured-prices] listing failed:", err instanceof Error ? err.message : err);
        for (const hid of missing) {
          prices[String(hid)] = null;
        }
      }
    }

    return apiSuccess({
      checkIn,
      checkOut,
      prices,
    });
  } catch (error) {
    if (error instanceof TripJackHotelApiError) {
      return apiError(error.message, error.statusCode ?? 502);
    }
    const message = error instanceof Error ? error.message : "Failed to load featured prices";
    return apiError(message, 500);
  }
}
