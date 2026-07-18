/** Customer-safe hotel error messages — never expose raw TripJack/proxy text. */

const FRIENDLY_BY_CODE: Record<string, string> = {
  SEARCH_SESSION_EXPIRED: "Your session expired. Please search for hotels again.",
  HOTEL_BOOKING_DISABLED: "Hotel booking is temporarily unavailable. Please contact support.",
  PAN_MISSING: "PAN number is required for this hotel.",
  PASSPORT_MISSING: "Passport details are required for this hotel.",
  INVALID_HOTEL_ID: "This hotel is no longer available. Please choose another property.",
  SUPPLIER_UNAVAILABLE: "Hotel supplier is busy. Please try again in a moment.",
  RATE_CHANGED: "Hotel availability changed. Please select another room.",
  SOLD_OUT: "This room is no longer available. Please choose another room.",
  SESSION_EXPIRED: "Your session expired. Please search hotels again.",
  AUTH_REQUIRED: "Please complete guest details to continue.",
};

function isInternalBookingGateMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("tripjack_hotel_allow_staging_booking") ||
    lower.includes("staging hotel bookings are disabled") ||
    lower.includes("tripjack_hotel_live_booking") ||
    lower.includes("tripjack_hotel_allow_vercel_preview") ||
    lower.includes("rzp_live_")
  );
}

export function mapHotelCustomerError(input: {
  message?: string;
  code?: string;
}): string {
  if (input.code && FRIENDLY_BY_CODE[input.code]) {
    return FRIENDLY_BY_CODE[input.code];
  }

  const raw = (input.message ?? "").trim();
  if (!raw) return "Something went wrong. Please try again.";

  if (isInternalBookingGateMessage(raw)) {
    return "Hotel booking is temporarily unavailable. Please contact support.";
  }

  const lower = raw.toLowerCase();
  if (
    lower.includes("hotel booking unavailable") ||
    lower.includes("live hotel booking is disabled") ||
    lower.includes("razorpay")
  ) {
    if (isInternalBookingGateMessage(raw)) {
      return "Hotel booking is temporarily unavailable. Please contact support.";
    }
    return raw.length > 400 ? `${raw.slice(0, 400)}…` : raw;
  }
  if (
    lower.includes("invalid json") ||
    lower.includes("upstream") ||
    lower.includes("proxy") ||
    lower.includes("api key") ||
    lower.includes("unauthorized") ||
    lower.includes("tripjack")
  ) {
    return "Hotel service is temporarily unavailable. Please try again shortly.";
  }
  if (lower.includes("supplier_unavailable") || lower.includes("timeout")) {
    return "Hotel supplier is busy. Please retry in a moment.";
  }
  if (lower.includes("session expired") || lower.includes("search again")) {
    return raw.length <= 120 ? raw : "Your session expired. Please search hotels again.";
  }
  if (lower.includes("sold out") || lower.includes("not available")) {
    return "Hotel availability changed. Please select another room.";
  }
  if (lower.includes("payment")) {
    return raw.length <= 120 ? raw : "Payment could not be completed. Please try again.";
  }

  return raw.length > 140 ? "Something went wrong. Our team has been notified." : raw;
}

export function parseHotelApiClientError(json: {
  error?: string;
  details?: { code?: string; message?: string; blockers?: string[]; adminMessage?: string };
}): string {
  const blockers = (json.details?.blockers ?? []).filter(
    (b) => !isInternalBookingGateMessage(b)
  );
  if (blockers.length) {
    return `${json.error ?? "Hotel booking unavailable"}\n${blockers.map((b) => `• ${b}`).join("\n")}`;
  }
  if (json.details?.blockers?.length && blockers.length === 0) {
    return mapHotelCustomerError({
      message: json.error,
      code: json.details?.code ?? "HOTEL_BOOKING_DISABLED",
    });
  }
  if (json.details?.adminMessage && !isInternalBookingGateMessage(json.details.adminMessage)) {
    return String(json.details.adminMessage);
  }
  return mapHotelCustomerError({
    message: json.error ?? json.details?.message,
    code: json.details?.code,
  });
}
