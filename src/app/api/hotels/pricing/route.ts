import { z } from "zod";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import { getTripJackHotelCatalogEntryByHid } from "@/lib/tripjack-hotels/catalog-firestore";
import { catalogEntryImageUrls } from "@/lib/tripjack-hotels/hotel-images";
import {
  buildHotelPricingBody,
  fetchTripJackHotelPricing,
  TripJackHotelApiError,
} from "@/lib/tripjack-hotels/client";
import {
  DEFAULT_HOTEL_CURRENCY,
  DEFAULT_HOTEL_NATIONALITY,
  isTripJackHotelProviderEnabled,
} from "@/lib/tripjack-hotels/config";
import { mapHotelPricingError } from "@/lib/tripjack-hotels/pricing-errors";

const roomSchema = z.object({
  adults: z.number().int().min(1).max(8),
  children: z.number().int().min(0).max(6).optional(),
  childAge: z.array(z.number().int().min(0).max(17)).optional(),
});

const schema = z.object({
  correlationId: z.string().min(1),
  hid: z.union([z.string(), z.number()]),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rooms: z.array(roomSchema).min(1).max(9),
  currency: z.string().default(DEFAULT_HOTEL_CURRENCY),
  nationality: z.string().default(DEFAULT_HOTEL_NATIONALITY),
  listingHotelName: z.string().optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
});

export async function POST(request: Request) {
  const auth = await optionalAuthenticateRequest(request);
  const isSuperAdmin = Boolean(auth && canAccessAICenter(auth.role));
  const includeDebug = Boolean(auth && isStaffUser(auth));

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
      return apiError("checkOut must be after checkIn", 400, { code: "INVALID_DATE_RANGE" });
    }

    for (const room of parsed.data.rooms) {
      const children = room.children ?? 0;
      if (children > 0 && (!room.childAge || room.childAge.length < children)) {
        return apiError("childAge is required for each child", 400, { code: "INVALID_ROOM_CONFIG" });
      }
    }

    const catalog = await getTripJackHotelCatalogEntryByHid(parsed.data.hid);
    const started = Date.now();

    const result = await fetchTripJackHotelPricing({
      correlationId: parsed.data.correlationId,
      hid: parsed.data.hid,
      checkIn: parsed.data.checkIn,
      checkOut: parsed.data.checkOut,
      rooms: parsed.data.rooms,
      currency: parsed.data.currency,
      nationality: parsed.data.nationality,
      listingHotelName: parsed.data.listingHotelName,
      catalogEnrichment: catalog
        ? {
            name: catalog.name,
            address: catalog.address,
            cityName: catalog.cityName,
            countryName: catalog.countryName,
            rating: catalog.rating,
            imageUrls: catalogEntryImageUrls(catalog),
            heroImage: catalog.heroImage,
            images: catalog.images,
            facilities: catalog.facilities,
          }
        : undefined,
    });

    const requestBody = buildHotelPricingBody(parsed.data);

    return apiSuccess({
      detail: result.detail,
      elapsedMs: result.elapsedMs ?? Date.now() - started,
      requestBody,
      proxyEndpoint: `${process.env.TRIPJACK_PROXY_BASE_URL?.replace(/\/$/, "") || "http://178.128.151.233:4000"}/api/tripjack/hotels/pricing`,
      ...(includeDebug
        ? {
            debug: {
              optionCount: result.detail.options.length,
              reviewHashPresent: Boolean(result.detail.reviewHash),
              elapsedMs: result.elapsedMs,
              catalogFound: Boolean(catalog),
            },
          }
        : {}),
      ...(isSuperAdmin
        ? {
            adminDebug: {
              requestBody,
              rawResponse: result.rawResponse,
            },
          }
        : {}),
    });
  } catch (err) {
    if (err instanceof TripJackHotelApiError) {
      const mapped = mapHotelPricingError({
        raw: err.raw,
        httpStatus: err.statusCode,
        fallbackMessage: err.message,
      });
      console.error("[hotels/pricing]", mapped.code, err.message, err.statusCode);

      return apiError(mapped.message, err.statusCode ?? 502, {
        code: mapped.code,
        upstreamUrl: err.upstreamUrl,
        retryable: mapped.retryable,
        retryAfterSeconds: err.retryAfterSeconds ?? mapped.retryAfterSeconds,
        backToSearch: mapped.backToSearch ?? false,
        ...(isSuperAdmin && mapped.adminMessage ? { adminMessage: mapped.adminMessage } : {}),
      });
    }
    const message = err instanceof Error ? err.message : "Hotel pricing failed";
    console.error("[hotels/pricing]", message);
    return apiError(message, 500);
  }
}
