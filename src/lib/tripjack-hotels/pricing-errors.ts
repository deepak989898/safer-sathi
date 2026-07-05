export type TripJackHotelPricingErrorCode =
  | "INVALID_HOTEL_ID"
  | "INVALID_DATE_RANGE"
  | "INVALID_ROOM_CONFIG"
  | "SUPPLIER_UNAVAILABLE"
  | "AUTH_ERROR"
  | "RATE_LIMIT"
  | "UNKNOWN";

export interface MappedHotelPricingError {
  code: TripJackHotelPricingErrorCode;
  message: string;
  adminMessage?: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  backToSearch?: boolean;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function collectStrings(raw: unknown): string[] {
  const record = asRecord(raw);
  if (!record) return [];

  const parts: string[] = [];
  if (typeof record.error === "string") parts.push(record.error);
  if (typeof record.message === "string") parts.push(record.message);

  for (const err of Array.isArray(record.errors) ? record.errors : []) {
    const rec = asRecord(err);
    if (!rec) continue;
    for (const key of ["errCode", "code", "errorCode", "message", "detail"]) {
      const v = rec[key];
      if (typeof v === "string") parts.push(v);
    }
  }

  const upstream = asRecord(record.upstreamData) ?? asRecord(record.data);
  if (upstream) parts.push(...collectStrings(upstream));

  return parts;
}

export function extractPricingErrorCode(raw: unknown, httpStatus?: number): TripJackHotelPricingErrorCode {
  const blob = collectStrings(raw).join(" ").toUpperCase();

  if (httpStatus === 401 || blob.includes("401") || blob.includes("UNAUTHORIZED") || blob.includes("APIKEY")) {
    return "AUTH_ERROR";
  }
  if (httpStatus === 429 || blob.includes("429") || blob.includes("RATE LIMIT") || blob.includes("TOO MANY")) {
    return "RATE_LIMIT";
  }
  if (blob.includes("INVALID_HOTEL_ID") || blob.includes("INVALID HOTEL") || blob.includes("HOTEL NOT FOUND")) {
    return "INVALID_HOTEL_ID";
  }
  if (blob.includes("INVALID_DATE_RANGE") || blob.includes("INVALID DATE") || blob.includes("DATE RANGE")) {
    return "INVALID_DATE_RANGE";
  }
  if (blob.includes("INVALID_ROOM_CONFIG") || blob.includes("ROOM CONFIG") || blob.includes("INVALID ROOM")) {
    return "INVALID_ROOM_CONFIG";
  }
  if (blob.includes("SUPPLIER_UNAVAILABLE") || blob.includes("SUPPLIER UNAVAILABLE") || blob.includes("SUPPLIER")) {
    return "SUPPLIER_UNAVAILABLE";
  }

  return "UNKNOWN";
}

export function mapHotelPricingError(input: {
  raw?: unknown;
  httpStatus?: number;
  fallbackMessage?: string;
  retryAfterHeader?: string | null;
}): MappedHotelPricingError {
  const code = extractPricingErrorCode(input.raw, input.httpStatus);
  const fallback = input.fallbackMessage ?? "Unable to load hotel pricing";

  switch (code) {
    case "INVALID_HOTEL_ID":
      return {
        code,
        message: "This hotel is not available. Please search again and choose another hotel.",
        retryable: false,
        backToSearch: true,
      };
    case "INVALID_DATE_RANGE":
      return {
        code,
        message: "Your selected dates are no longer valid. Please search hotels again.",
        retryable: false,
        backToSearch: true,
      };
    case "INVALID_ROOM_CONFIG":
      return {
        code,
        message: "Room configuration is invalid. Please adjust adults, children, or room count and try again.",
        retryable: false,
      };
    case "SUPPLIER_UNAVAILABLE":
      return {
        code,
        message: "Supplier is temporarily unavailable. Please retry in a moment.",
        retryable: true,
      };
    case "AUTH_ERROR":
      return {
        code,
        message: "Hotel pricing is temporarily unavailable. Please try again shortly.",
        adminMessage: "TripJack authentication failed (401). Check TRIPJACK_API_KEY on VPS proxy.",
        retryable: false,
      };
    case "RATE_LIMIT": {
      const retryAfterSeconds = parseRetryAfter(input.retryAfterHeader);
      return {
        code,
        message: retryAfterSeconds
          ? `Too many requests. Please wait ${retryAfterSeconds} seconds and retry.`
          : "Too many requests. Please wait a moment and retry.",
        retryable: true,
        retryAfterSeconds,
      };
    }
    default:
      return {
        code,
        message: fallback,
        retryable: input.httpStatus ? input.httpStatus >= 500 : false,
      };
  }
}

function parseRetryAfter(header?: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(1, Math.ceil(seconds));
  const dateMs = Date.parse(header);
  if (Number.isFinite(dateMs)) {
    return Math.max(1, Math.ceil((dateMs - Date.now()) / 1000));
  }
  return undefined;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
