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
import { mapHotelReviewError } from "@/lib/tripjack-hotels/review-errors";
import type { HotelReviewPrepSession } from "@/lib/tripjack-hotels/types";

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

const schema = z.object({
  correlationId: z.string().min(1),
  optionId: z.string().min(1),
  reviewHash: z.string().min(1),
  hid: z.union([z.string(), z.number()]),
  hotelName: z.string().optional(),
  searchContext: searchContextSchema,
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

    const started = Date.now();
    const result = await fetchTripJackHotelReview({
      correlationId: parsed.data.correlationId,
      optionId: parsed.data.optionId,
      reviewHash: parsed.data.reviewHash,
      hid: parsed.data.hid,
      hotelName: parsed.data.hotelName,
      searchContext: parsed.data.searchContext as HotelReviewPrepSession["searchContext"],
    });

    const requestBody = buildHotelReviewBody(parsed.data);

    return apiSuccess({
      review: result.review,
      elapsedMs: result.elapsedMs ?? Date.now() - started,
      requestBody,
      proxyEndpoint: `${process.env.TRIPJACK_PROXY_BASE_URL?.replace(/\/$/, "") || "http://178.128.151.233:4000"}/api/tripjack/hotels/review`,
      ...(includeDebug
        ? {
            debug: {
              bookingId: result.review.bookingId,
              statusSuccess: result.review.statusSuccess,
              elapsedMs: result.elapsedMs,
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
