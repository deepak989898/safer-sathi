import { z } from "zod";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import {
  buildHotelListingBody,
  listTripJackHotels,
  TripJackHotelApiError,
} from "@/lib/tripjack-hotels/client";
import { DEFAULT_HOTEL_CURRENCY, DEFAULT_HOTEL_NATIONALITY } from "@/lib/tripjack-hotels/config";

const roomSchema = z.object({
  adults: z.number().int().min(1).max(8),
  children: z.number().int().min(0).max(6).optional(),
  childAge: z.array(z.number().int().min(0).max(17)).optional(),
});

const schema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rooms: z.array(roomSchema).min(1),
  currency: z.string().default(DEFAULT_HOTEL_CURRENCY),
  nationality: z.string().default(DEFAULT_HOTEL_NATIONALITY),
  correlationId: z.string().optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
  hids: z.array(z.number().int().positive()).min(1),
  destinationLabel: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    if (parsed.data.checkOut <= parsed.data.checkIn) {
      return apiError("checkOut must be after checkIn", 400);
    }

    for (const room of parsed.data.rooms) {
      const children = room.children ?? 0;
      if (children > 0 && (!room.childAge || room.childAge.length < children)) {
        return apiError("childAge is required for each child", 400);
      }
    }

    const result = await listTripJackHotels(parsed.data);
    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));
    const requestBody = buildHotelListingBody(parsed.data);

    return apiSuccess({
      correlationId: result.correlationId,
      nationality: result.nationality,
      currency: result.currency,
      totalResults: result.totalResults,
      hotels: result.hotels,
      message:
        result.hotels.length > 0
          ? `${result.totalResults} hotel(s) found`
          : "No hotels found. Try different dates or hotel IDs.",
      requestBody,
      proxyEndpoint: `${process.env.TRIPJACK_PROXY_BASE_URL?.replace(/\/$/, "") || "http://178.128.151.233:4000"}/api/tripjack/hotels/listing`,
      ...(includeDebug
        ? {
            debug: {
              omittedRawResponse: true,
              hotelCount: result.hotels.length,
              correlationId: result.correlationId,
            },
          }
        : {}),
    });
  } catch (err) {
    if (err instanceof TripJackHotelApiError) {
      return apiError(err.message, err.statusCode ?? 502, {
        upstreamUrl: err.upstreamUrl,
        ...(err.raw && typeof err.raw === "object" ? { details: err.raw } : {}),
      });
    }
    const message = err instanceof Error ? err.message : "Hotel listing failed";
    return apiError(message, 500);
  }
}
