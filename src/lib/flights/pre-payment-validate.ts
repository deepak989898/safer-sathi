import "server-only";

import type { FlightBookingRecord } from "@/lib/flights/types";
import { updateFlightBooking } from "@/lib/flights/firestore";
import { logFlightApiCall } from "@/lib/flights/api-logging";
import { fareValidateTripJackFlight } from "@/lib/tripjack/client";
import type { FareValidateRequest, NormalizedFareValidate } from "@/lib/tripjack/types";

export type PrePaymentFareValidateResult =
  | {
      ok: true;
      fareChanged: false;
      validated: NormalizedFareValidate;
      booking: FlightBookingRecord;
    }
  | {
      ok: true;
      fareChanged: true;
      validated: NormalizedFareValidate;
      previousFare: number;
      booking: FlightBookingRecord;
    }
  | {
      ok: false;
      reason: "unavailable" | "missing_session";
      message: string;
    };

export async function revalidateFlightFareBeforePayment(
  booking: FlightBookingRecord
): Promise<PrePaymentFareValidateResult> {
  const request = booking.fareValidateRequest as FareValidateRequest | undefined;
  if (!request?.bookingId || !request.travellerInfo?.length) {
    return {
      ok: false,
      reason: "missing_session",
      message: "Fare validate session expired. Go back to passengers and validate again.",
    };
  }

  const started = Date.now();
  let rawResponse: unknown;
  let validated: NormalizedFareValidate;

  try {
    const result = await fareValidateTripJackFlight({
      request,
      previousTotalFare: booking.totalFare,
    });
    validated = result.validated;
    rawResponse = result.rawResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fare validate failed";
    await logFlightApiCall({
      bookingId: booking.bookingId,
      endpoint: "fare-validate/pre-payment",
      method: "POST",
      requestBody: request,
      success: false,
      errorMessage: message,
      durationMs: Date.now() - started,
    });
    return { ok: false, reason: "unavailable", message };
  }

  await logFlightApiCall({
    bookingId: booking.bookingId,
    endpoint: "fare-validate/pre-payment",
    method: "POST",
    requestBody: request,
    responseBody: validated,
    success: !validated.fareUnavailable,
    errorMessage: validated.fareUnavailable ? validated.fareAlertMessage ?? undefined : undefined,
    durationMs: Date.now() - started,
  });

  if (validated.fareUnavailable) {
    return {
      ok: false,
      reason: "unavailable",
      message: validated.fareAlertMessage ?? "This fare is no longer available. Please search again.",
    };
  }

  const previousFare = booking.totalFare;
  const fareChanged =
    validated.fareChanged ||
    (previousFare > 0 &&
      validated.totalFare > 0 &&
      Math.abs(previousFare - validated.totalFare) > 0.01);

  const updated = await updateFlightBooking(booking.bookingId, {
    fareValidateNormalized: validated,
    fareValidateResponse: rawResponse,
    tripjackBookingId: validated.bookingId || booking.tripjackBookingId,
    totalFare: validated.totalFare,
    baseFare: validated.baseFare,
    taxesAndFees: validated.taxesAndFees,
    priceId: validated.priceId || booking.priceId,
    fareIdentifier: validated.fareIdentifier || booking.fareIdentifier,
  });

  const nextBooking = updated ?? {
    ...booking,
    fareValidateNormalized: validated,
    totalFare: validated.totalFare,
  };

  if (fareChanged) {
    return {
      ok: true,
      fareChanged: true,
      validated,
      previousFare,
      booking: nextBooking,
    };
  }

  return { ok: true, fareChanged: false, validated, booking: nextBooking };
}
