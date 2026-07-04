import { z } from "zod";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import {
  buildHotelDetailBody,
  fetchTripJackHotelDetail,
  TripJackHotelApiError,
} from "@/lib/tripjack-hotels/client";
import {
  DEFAULT_HOTEL_CURRENCY,
  DEFAULT_HOTEL_NATIONALITY,
  isTripJackHotelProviderEnabled,
} from "@/lib/tripjack-hotels/config";

const roomSchema = z.object({
  adults: z.number().int().min(1).max(8),
  children: z.number().int().min(0).max(6).optional(),
  childAge: z.array(z.number().int().min(0).max(17)).optional(),
});

const schema = z.object({
  correlationId: z.string().min(1),
  hotelId: z.union([z.string(), z.number()]),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rooms: z.array(roomSchema).min(1),
  currency: z.string().default(DEFAULT_HOTEL_CURRENCY),
  nationality: z.string().default(DEFAULT_HOTEL_NATIONALITY),
  listingHotelName: z.string().optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
});

export async function POST(request: Request) {
  try {
    if (!isTripJackHotelProviderEnabled()) {
      return apiError("TripJack hotel provider is disabled", 503);
    }

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    if (parsed.data.checkOut <= parsed.data.checkIn) {
      return apiError("checkOut must be after checkIn", 400);
    }

    const started = Date.now();
    const result = await fetchTripJackHotelDetail(parsed.data);
    const auth = await optionalAuthenticateRequest(request);
    const includeDebug = Boolean(auth && isStaffUser(auth));

    // Never send commercial commission to non-staff clients in a visible way —
    // commercial is kept in session only for Review prep; strip commission from options for response safety is optional.
    // We keep commercial in option for continue flow but UI must not render it.

    return apiSuccess({
      detail: result.detail,
      elapsedMs: result.elapsedMs ?? Date.now() - started,
      requestBody: buildHotelDetailBody(parsed.data),
      proxyEndpoint: `${process.env.TRIPJACK_PROXY_BASE_URL?.replace(/\/$/, "") || "http://178.128.151.233:4000"}/api/tripjack/hotels/detail`,
      ...(includeDebug
        ? {
            debug: {
              omittedRawResponse: true,
              optionCount: result.detail.options.length,
              reviewHashPresent: Boolean(result.detail.reviewHash),
              elapsedMs: result.elapsedMs,
            },
          }
        : {}),
    });
  } catch (err) {
    if (err instanceof TripJackHotelApiError) {
      console.error("[hotels/detail]", err.message, err.statusCode);
      return apiError(err.message, err.statusCode ?? 502, {
        upstreamUrl: err.upstreamUrl,
      });
    }
    const message = err instanceof Error ? err.message : "Hotel detail failed";
    console.error("[hotels/detail]", message);
    return apiError(message, 500);
  }
}
