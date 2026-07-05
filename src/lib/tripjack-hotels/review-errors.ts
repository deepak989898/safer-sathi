export type TripJackHotelReviewErrorCode =
  | "OPTION_SOLD_OUT"
  | "INVALID_SEARCH_ID"
  | "SEARCH_SESSION_EXPIRED"
  | "INVALID_HOTEL_ID"
  | "INVALID_DATE_RANGE"
  | "SUPPLIER_UNAVAILABLE"
  | "AUTH_ERROR"
  | "RATE_LIMIT"
  | "UNKNOWN";

export interface MappedHotelReviewError {
  code: TripJackHotelReviewErrorCode;
  message: string;
  adminMessage?: string;
  retryable: boolean;
  retryAfterSeconds?: number;
  backToSearch?: boolean;
  backToDetail?: boolean;
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

export function extractReviewErrorCode(
  raw: unknown,
  httpStatus?: number
): TripJackHotelReviewErrorCode {
  const blob = collectStrings(raw).join(" ").toUpperCase();

  if (httpStatus === 401 || blob.includes("401") || blob.includes("UNAUTHORIZED") || blob.includes("APIKEY")) {
    return "AUTH_ERROR";
  }
  if (httpStatus === 429 || blob.includes("429") || blob.includes("RATE LIMIT") || blob.includes("TOO MANY")) {
    return "RATE_LIMIT";
  }
  if (blob.includes("OPTION_SOLD_OUT") || blob.includes("SOLD OUT") || blob.includes("ROOM SOLD")) {
    return "OPTION_SOLD_OUT";
  }
  if (
    blob.includes("INVALID_SEARCH_ID") ||
    blob.includes("SEARCH_SESSION_EXPIRED") ||
    blob.includes("SESSION EXPIRED") ||
    blob.includes("CORRELATION")
  ) {
    return blob.includes("SESSION") ? "SEARCH_SESSION_EXPIRED" : "INVALID_SEARCH_ID";
  }
  if (blob.includes("INVALID_HOTEL_ID") || blob.includes("INVALID HOTEL") || blob.includes("HOTEL NOT FOUND")) {
    return "INVALID_HOTEL_ID";
  }
  if (blob.includes("INVALID_DATE_RANGE") || blob.includes("INVALID DATE") || blob.includes("DATE RANGE")) {
    return "INVALID_DATE_RANGE";
  }
  if (blob.includes("SUPPLIER_UNAVAILABLE") || blob.includes("SUPPLIER UNAVAILABLE")) {
    return "SUPPLIER_UNAVAILABLE";
  }

  return "UNKNOWN";
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

export function mapHotelReviewError(input: {
  raw?: unknown;
  httpStatus?: number;
  fallbackMessage?: string;
  retryAfterHeader?: string | null;
}): MappedHotelReviewError {
  const code = extractReviewErrorCode(input.raw, input.httpStatus);
  const fallback = input.fallbackMessage ?? "Unable to review hotel booking";

  switch (code) {
    case "OPTION_SOLD_OUT":
      return {
        code,
        message: "Selected room sold out. Please choose another room.",
        retryable: false,
        backToDetail: true,
      };
    case "INVALID_SEARCH_ID":
    case "SEARCH_SESSION_EXPIRED":
      return {
        code,
        message: "Session expired. Please search hotels again.",
        retryable: false,
        backToSearch: true,
      };
    case "INVALID_HOTEL_ID":
      return {
        code,
        message: "Hotel not available. Please search again.",
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
    case "SUPPLIER_UNAVAILABLE":
      return {
        code,
        message: "Supplier is temporarily unavailable. Please retry in a moment.",
        retryable: true,
      };
    case "AUTH_ERROR":
      return {
        code,
        message: "Hotel review is temporarily unavailable. Please try again shortly.",
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

export { sleep } from "@/lib/tripjack-hotels/pricing-errors";
