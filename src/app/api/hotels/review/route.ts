import { z } from "zod";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { isStaffUser, optionalAuthenticateRequest } from "@/lib/auth/server-auth";
import {
  buildHotelReviewBody,
  fetchTripJackHotelReview,
  TripJackHotelApiError,
} from "@/lib/tripjack-hotels/client";
import { isTripJackHotelProviderEnabled } from "@/lib/tripjack-hotels/config";
import { applyHotelMarkupToReview } from "@/lib/tripjack-hotels/pricing-display";
import { mapHotelReviewError } from "@/lib/tripjack-hotels/review-errors";
import { getHotelWebsiteSettings } from "@/lib/hotels/website-settings";
import type { HotelReviewPrepSession, NormalizedHotelOption } from "@/lib/tripjack-hotels/types";
import {
  getTripJackHotelPriceCache,
  isOfflineCacheReviewHash,
  shouldFallbackToPriceCache,
  synthesizeOfflineHotelReview,
} from "@/lib/tripjack-hotels/price-cache";

const roomSchema = z.object({
  adults: z.number().int().min(1).max(8),
  children: z.number().int().min(0).max(6).optional(),
  childAge: z.array(z.number().int().min(0).max(17)).optional(),
});

const searchContextSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rooms: z.array(roomSchema).min(1).max(9),
  currency: z.string(),
  nationality: z.string(),
});

const selectedOptionSchema = z
  .object({
    optionId: z.string().min(1),
    roomName: z.string().optional(),
    pricing: z
      .object({
        totalPrice: z.number().positive(),
        basePrice: z.number().optional(),
        taxes: z.number().optional(),
        mf: z.number().optional(),
        mft: z.number().optional(),
        discount: z.number().optional(),
        currency: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .optional();

const schema = z.object({
  correlationId: z.string().min(1),
  optionId: z.string().min(1),
  reviewHash: z.string().min(1),
  hid: z.union([z.string(), z.number()]),
  hotelName: z.string().optional(),
  searchContext: searchContextSchema,
  /** Client may send the selected option so offline review can lock without TripJack */
  selectedOption: selectedOptionSchema,
});

async function buildOfflineReview(parsed: z.infer<typeof schema>, markupPercent: number) {
  const cache = await getTripJackHotelPriceCache(parsed.hid);
  let option =
    cache?.options.find((item) => item.optionId === parsed.optionId) ??
    (parsed.selectedOption as NormalizedHotelOption | undefined);

  if (!option && cache?.options?.length) {
    option = cache.options[0];
  }

  if (!option?.optionId || !option.pricing?.totalPrice) {
    return null;
  }

  const review = synthesizeOfflineHotelReview({
    correlationId: parsed.correlationId,
    hid: parsed.hid,
    hotelName: parsed.hotelName || cache?.hotelName || "Hotel",
    option,
    searchContext: parsed.searchContext as HotelReviewPrepSession["searchContext"],
    reviewHash: parsed.reviewHash,
  });

  return applyHotelMarkupToReview(review, markupPercent);
}

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

    const websiteSettings = await getHotelWebsiteSettings();
    const markupPercent = Math.max(0, websiteSettings.hotelMarkupPercent ?? 0);
    const started = Date.now();
    const requestBody = buildHotelReviewBody(parsed.data);

    // Pricing already served from Firestore — lock offline without calling TripJack.
    if (isOfflineCacheReviewHash(parsed.data.reviewHash)) {
      const review = await buildOfflineReview(parsed.data, markupPercent);
      if (!review) {
        return apiError(
          "Saved room rates are unavailable for this hotel. Please try again when live rates are back.",
          503,
          { code: "OFFLINE_PRICE_CACHE_MISS", retryable: true }
        );
      }

      return apiSuccess({
        review,
        markupPercent,
        source: "cache",
        bookingMode: "offline_cache",
        elapsedMs: Date.now() - started,
        requestBody,
        proxyEndpoint: `${process.env.TRIPJACK_PROXY_BASE_URL?.replace(/\/$/, "") || "http://178.128.151.233:4000"}/api/tripjack/hotels/review`,
        ...(includeDebug
          ? {
              debug: {
                bookingId: review.bookingId,
                statusSuccess: review.statusSuccess,
                elapsedMs: Date.now() - started,
                markupPercent,
                source: "cache",
              },
            }
          : {}),
      });
    }

    try {
      const result = await fetchTripJackHotelReview({
        correlationId: parsed.data.correlationId,
        optionId: parsed.data.optionId,
        reviewHash: parsed.data.reviewHash,
        hid: parsed.data.hid,
        hotelName: parsed.data.hotelName,
        searchContext: parsed.data.searchContext as HotelReviewPrepSession["searchContext"],
      });

      const review = {
        ...applyHotelMarkupToReview(result.review, markupPercent),
        bookingMode: "live" as const,
        priceSource: "live" as const,
      };

      return apiSuccess({
        review,
        markupPercent,
        source: "live",
        bookingMode: "live",
        elapsedMs: result.elapsedMs ?? Date.now() - started,
        requestBody,
        proxyEndpoint: `${process.env.TRIPJACK_PROXY_BASE_URL?.replace(/\/$/, "") || "http://178.128.151.233:4000"}/api/tripjack/hotels/review`,
        ...(includeDebug
          ? {
              debug: {
                bookingId: review.bookingId,
                statusSuccess: review.statusSuccess,
                elapsedMs: result.elapsedMs,
                markupPercent,
                source: "live",
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
    } catch (liveError) {
      const canFallback =
        liveError instanceof TripJackHotelApiError
          ? shouldFallbackToPriceCache(liveError)
          : true;

      if (!canFallback) throw liveError;

      const review = await buildOfflineReview(parsed.data, markupPercent);
      if (!review) throw liveError;

      console.warn(
        "[hotels/review] live failed; locking offline cache for",
        parsed.data.hid,
        liveError instanceof Error ? liveError.message : liveError
      );

      return apiSuccess({
        review,
        markupPercent,
        source: "cache",
        bookingMode: "offline_cache",
        elapsedMs: Date.now() - started,
        requestBody,
        proxyEndpoint: `${process.env.TRIPJACK_PROXY_BASE_URL?.replace(/\/$/, "") || "http://178.128.151.233:4000"}/api/tripjack/hotels/review`,
        ...(includeDebug
          ? {
              debug: {
                bookingId: review.bookingId,
                statusSuccess: review.statusSuccess,
                elapsedMs: Date.now() - started,
                markupPercent,
                source: "cache",
              },
            }
          : {}),
      });
    }
  } catch (err) {
    if (err instanceof TripJackHotelApiError) {
      const mapped = mapHotelReviewError({
        raw: err.raw,
        httpStatus: err.statusCode,
        fallbackMessage: err.message,
      });
      console.error("[hotels/review]", mapped.code, err.message, err.statusCode);

      return apiError(mapped.message, err.statusCode ?? 502, {
        code: mapped.code,
        upstreamUrl: err.upstreamUrl,
        retryable: mapped.retryable,
        retryAfterSeconds: err.retryAfterSeconds ?? mapped.retryAfterSeconds,
        backToSearch: mapped.backToSearch ?? false,
        backToDetail: mapped.backToDetail ?? false,
        ...(isSuperAdmin && mapped.adminMessage ? { adminMessage: mapped.adminMessage } : {}),
      });
    }
    const message = err instanceof Error ? err.message : "Hotel review failed";
    console.error("[hotels/review]", message);
    return apiError(message, 500);
  }
}
