import { generateHotelCorrelationId } from "@/lib/tripjack-hotels/correlation";
import {
  isHotelSearchSessionExpired,
  loadHotelListingSession,
  saveHotelListingSession,
} from "@/lib/tripjack-hotels/session";
import type { HotelListingSearchParams } from "@/lib/tripjack-hotels/types";

export function getDefaultDirectHotelSearchParams(): HotelListingSearchParams {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 1);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);

  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
    rooms: [{ adults: 2 }],
    currency: "INR",
    nationality: "106",
  };
}

export function ensureHotelDetailSearchSession(): {
  correlationId: string;
  request: HotelListingSearchParams;
  hasListingResults: boolean;
  isDirectAccess: boolean;
} {
  const session = loadHotelListingSession();
  const hasValidSession =
    Boolean(session.correlationId) &&
    Boolean(session.request?.checkIn) &&
    Boolean(session.request?.checkOut) &&
    !isHotelSearchSessionExpired();

  if (hasValidSession && session.request && session.correlationId) {
    return {
      correlationId: session.correlationId,
      request: session.request,
      hasListingResults: session.hotels.length > 0,
      isDirectAccess: false,
    };
  }

  const defaults = getDefaultDirectHotelSearchParams();
  const correlationId = generateHotelCorrelationId();
  const request: HotelListingSearchParams = {
    ...defaults,
    correlationId,
  };

  saveHotelListingSession({
    request,
    correlationId,
    hotels: [],
    totalResults: 0,
    currency: defaults.currency,
    nationality: defaults.nationality,
  });

  return {
    correlationId,
    request,
    hasListingResults: false,
    isDirectAccess: true,
  };
}
