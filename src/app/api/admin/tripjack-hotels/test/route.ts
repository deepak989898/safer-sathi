import { requireSuperAdminAuth } from "@/lib/admin/api-auth";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { fetchTripJackHotelBookingDetails, fetchTripJackHotelReview } from "@/lib/tripjack-hotels/client";
import { listTripJackHotels } from "@/lib/tripjack-hotels/client";
import { fetchTripJackHotelPricing } from "@/lib/tripjack-hotels/client";
import {
  fetchTripJackHotelContent,
  fetchTripJackHotelMapping,
  fetchTripJackHotelNationalities,
  TripJackHotelStaticApiError,
} from "@/lib/tripjack-hotels/static-client";
import { TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE } from "@/lib/tripjack-hotels/messages";
import { logTripJackHotelApiCall, sanitizeLogPayload } from "@/lib/tripjack-hotels/ops-firestore";

export async function POST(request: Request) {
  try {
    const auth = await requireSuperAdminAuth(request);
    if ("error" in auth) return auth.error;

    const { data, error } = await parseJsonBody(request);
    if (error) return error;

    const body = (data ?? {}) as { test: string; payload?: Record<string, unknown> };
    const test = body.test;
    const started = Date.now();
    let result: unknown;
    let success = true;
    let errorMessage: string | undefined;

    try {
      switch (test) {
        case "nationalities":
          result = await fetchTripJackHotelNationalities();
          break;
        case "hotel-mapping":
          result = await fetchTripJackHotelMapping({
            countryName: String(body.payload?.countryName ?? "INDIA"),
            page: Number(body.payload?.page ?? 0),
            size: Number(body.payload?.size ?? 5),
            ...(Array.isArray(body.payload?.regionIds)
              ? { regionIds: body.payload?.regionIds }
              : {}),
          });
          break;
        case "hotel-content":
          result = await fetchTripJackHotelContent({
            hotelIds: (body.payload?.hotelIds as string[]) ?? ["100001743803"],
          });
          break;
        case "listing":
          result = await listTripJackHotels({
            checkIn: String(body.payload?.checkIn ?? "2026-08-01"),
            checkOut: String(body.payload?.checkOut ?? "2026-08-03"),
            hids: (body.payload?.hids as number[]) ?? [1001],
            rooms: [{ adults: 2 }],
            currency: "INR",
            nationality: "106",
          });
          break;
        case "pricing":
          result = await fetchTripJackHotelPricing({
            correlationId: String(body.payload?.correlationId ?? "admin-test"),
            hid: Number(body.payload?.hid ?? 1001),
            checkIn: String(body.payload?.checkIn ?? "2026-08-01"),
            checkOut: String(body.payload?.checkOut ?? "2026-08-03"),
            rooms: [{ adults: 2 }],
            currency: "INR",
            nationality: "106",
          });
          break;
        case "review":
          result = await fetchTripJackHotelReview({
            correlationId: String(body.payload?.correlationId ?? "admin-test"),
            optionId: String(body.payload?.optionId ?? "admin-test"),
            reviewHash: String(body.payload?.reviewHash ?? "admin-test"),
            hid: Number(body.payload?.hid ?? 1001),
            searchContext: {
              checkIn: "2026-08-01",
              checkOut: "2026-08-03",
              rooms: [{ adults: 2 }],
              currency: "INR",
              nationality: "106",
            },
          });
          break;
        case "booking-details":
          result = await fetchTripJackHotelBookingDetails(
            String(body.payload?.bookingId ?? "")
          );
          break;
        default:
          return apiError(`Unknown test: ${test}`, 400);
      }
    } catch (e) {
      success = false;
      if (
        (test === "hotel-mapping" || test === "hotel-content") &&
        e instanceof TripJackHotelStaticApiError &&
        e.upstreamStatus === 403
      ) {
        errorMessage = TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE;
        result = {
          proxyRouteOk: true,
          upstreamStatus: e.upstreamStatus,
          upstreamUrl: e.upstreamUrl,
          bookingFlowUnblocked: true,
        };
      } else {
        errorMessage = e instanceof Error ? e.message : "Test failed";
        result = { error: errorMessage };
      }
    }

    await logTripJackHotelApiCall({
      endpoint: `admin-test:${test}`,
      method: "POST",
      userId: auth.user.id,
      role: auth.user.role,
      requestBody: sanitizeLogPayload(body.payload),
      responseBody: sanitizeLogPayload(result),
      success,
      errorMessage,
      durationMs: Date.now() - started,
    });

    if (!success) {
      if (
        (test === "hotel-mapping" || test === "hotel-content") &&
        errorMessage === TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE
      ) {
        return apiSuccess({
          test,
          result,
          warning: errorMessage,
          durationMs: Date.now() - started,
        });
      }
      return apiError(errorMessage ?? "Test failed", 502, { result });
    }

    return apiSuccess({ test, result, durationMs: Date.now() - started });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Test failed";
    return apiError(message, 500);
  }
}
