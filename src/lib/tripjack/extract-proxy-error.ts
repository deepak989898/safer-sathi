function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const AXIOS_STATUS_RE = /^Request failed with status code \d+$/;

function firstNestedErrorMessage(container: Record<string, unknown> | null): string | null {
  if (!container) return null;

  const errors = container.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = asRecord(errors[0]);
    const message = first?.message ?? first?.details;
    if (message != null && String(message).trim()) {
      return String(message).trim();
    }
  }

  const status = asRecord(container.status);
  if (status?.message != null && String(status.message).trim()) {
    return String(status.message).trim();
  }

  if (container.message != null && String(container.message).trim()) {
    return String(container.message).trim();
  }

  return null;
}

/** Pull a human TripJack/proxy message out of mixed VPS response shapes (fetch + legacy axios). */
export function extractTripJackProxyErrorMessage(
  record: Record<string, unknown>,
  fallback: string
): string {
  const layers = [
    asRecord(record.data),
    asRecord(record.upstreamData),
    asRecord(record.details),
    record,
  ];

  for (const layer of layers) {
    const message = firstNestedErrorMessage(layer);
    if (message && !AXIOS_STATUS_RE.test(message)) {
      return message;
    }
  }

  for (const key of ["error", "message"] as const) {
    const value = record[key];
    if (typeof value === "string" && value.trim() && !AXIOS_STATUS_RE.test(value.trim())) {
      return value.trim();
    }
  }

  return fallback;
}

export function fareValidateFailureHint(message: string, statusCode?: number): string {
  const lower = message.toLowerCase();
  if (lower.includes("expired") || lower.includes("newbookingid")) {
    return `${message} Go back to flight results, select the flight again, then fill passenger details.`;
  }
  if (statusCode === 502 || lower.includes("502")) {
    return "Fare validation could not reach TripJack (502). Wait a moment, then search and select the flight again for a fresh fare hold.";
  }
  return message;
}
