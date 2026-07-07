import { z } from "zod";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import {
  isStaffUser,
  optionalAuthenticateRequest,
} from "@/lib/auth/server-auth";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import {
  buildHotelListingBody,
  listTripJackHotels,
  TripJackHotelApiError,
} from "@/lib/tripjack-hotels/client";
import { getTripJackHotelCatalogMeta } from "@/lib/tripjack-hotels/catalog-firestore";
import { MAX_HOTEL_ROOMS } from "@/lib/tripjack-hotels/catalog-types";
import { DEFAULT_HOTEL_CURRENCY, DEFAULT_HOTEL_NATIONALITY, getTripJackHotelProxyBaseUrl } from "@/lib/tripjack-hotels/config";
import { resolveDestinationToHids } from "@/lib/tripjack-hotels/destination-resolver";

export const maxDuration = 60;

const roomSchema = z.object({
  adults: z.number().int().min(1).max(8),
  children: z.number().int().min(0).max(6).optional(),
  childAge: z.array(z.number().int().min(0).max(17)).optional(),
});

const schema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rooms: z.array(roomSchema).min(1).max(MAX_HOTEL_ROOMS),
  currency: z.string().default(DEFAULT_HOTEL_CURRENCY),
  nationality: z.string().default(DEFAULT_HOTEL_NATIONALITY),
  correlationId: z.string().optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
  destination: z.string().trim().min(2).optional(),
  destinationLabel: z.string().optional(),
  hids: z.array(z.number().int().positive()).optional(),
  adminOverrideHids: z.array(z.number().int().positive()).optional(),
});

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const today = todayIsoDate();
    if (parsed.data.checkIn < today) {
      return apiError("checkIn must be today or a future date", 400);
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

    const auth = await optionalAuthenticateRequest(request);
    const isSuperAdmin = Boolean(auth && canAccessAICenter(auth.role));

    let hids = parsed.data.hids ?? [];
    let destinationLabel = parsed.data.destinationLabel ?? parsed.data.destination ?? "";
    let destinationResolution: Awaited<ReturnType<typeof resolveDestinationToHids>> | null = null;

    if (parsed.data.adminOverrideHids?.length) {
      if (!isSuperAdmin) {
        return apiError("Only Super Admin can use manual TripJack hotel ID override", 403);
      }
      hids = parsed.data.adminOverrideHids;
      destinationLabel = destinationLabel || "Admin HID override";
    } else if (parsed.data.destination) {
      destinationResolution = await resolveDestinationToHids(parsed.data.destination);
      if (!destinationResolution.hids.length) {
        const catalogMeta = await getTripJackHotelCatalogMeta();
        const syncedCount = catalogMeta.activeHotels ?? 0;
        const destinationLabel = parsed.data.destination.trim();
        const message =
          syncedCount > 0
            ? `No synced hotels found for ${destinationLabel}. Try another city or run hotel catalog content sync for this region.`
            : `No synced hotels found for ${destinationLabel}. Please run India hotel catalog sync or search another city.`;
        return apiError(message, 404, { destinationResolution, catalogMeta });
      }
      hids = destinationResolution.hids;
      destinationLabel = destinationResolution.label || parsed.data.destination;
    } else if (!hids.length) {
      return apiError("destination is required", 400);
    }

    const listingParams = {
      ...parsed.data,
      hids,
      destinationLabel,
    };

    const result = await listTripJackHotels(listingParams);
    const includeDebug = Boolean(auth && isStaffUser(auth));
    const requestBody = buildHotelListingBody(listingParams);

    return apiSuccess({
      correlationId: result.correlationId,
      nationality: result.nationality,
      currency: result.currency,
      totalResults: result.totalResults,
      hotels: result.hotels,
      destinationLabel,
      destinationResolution,
      message:
        result.hotels.length > 0
          ? `${result.totalResults} hotel(s) found${destinationLabel ? ` in ${destinationLabel}` : ""}`
          : `No hotels found${destinationLabel ? ` for ${destinationLabel}` : ""}. Try different dates.`,
      requestBody,
      proxyEndpoint: `${getTripJackHotelProxyBaseUrl()}/api/tripjack/hotels/listing`,
      ...(includeDebug
        ? {
            debug: {
              omittedRawResponse: true,
              hotelCount: result.hotels.length,
              correlationId: result.correlationId,
              resolvedHids: hids,
              destinationResolution,
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
