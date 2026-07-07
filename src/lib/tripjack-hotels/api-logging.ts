import "server-only";

import { logTripJackHotelApiCall } from "@/lib/tripjack-hotels/ops-firestore";

export interface TripJackProxyLogInput {
  endpoint: string;
  url: string;
  method?: string;
  requestBody?: unknown;
  correlationId?: string;
  bookingId?: string;
  userId?: string;
  role?: string;
}

/** Proxy fetch with Firestore API logging (never logs API keys). */
export async function tripJackHotelProxyFetch(
  input: TripJackProxyLogInput
): Promise<{ response: Response; rawText: string }> {
  const method = input.method ?? "POST";
  const started = Date.now();
  let response: Response;
  let rawText = "";

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (method !== "GET" || input.requestBody != null) {
      headers["Content-Type"] = "application/json";
    }

    response = await fetch(input.url, {
      method,
      headers,
      body:
        method === "GET"
          ? undefined
          : input.requestBody != null
            ? JSON.stringify(input.requestBody)
            : "{}",
      cache: "no-store",
    });
    rawText = await response.text();
  } catch (networkError) {
    void logTripJackHotelApiCall({
      endpoint: input.endpoint,
      method,
      correlationId: input.correlationId,
      bookingId: input.bookingId,
      userId: input.userId,
      role: input.role,
      requestBody: input.requestBody,
      responseBody: null,
      httpStatus: 0,
      success: false,
      errorMessage: networkError instanceof Error ? networkError.message : "Network error",
      durationMs: Date.now() - started,
    });
    throw networkError;
  }

  let responseBody: unknown;
  try {
    responseBody = JSON.parse(rawText);
  } catch {
    responseBody = rawText.slice(0, 4000);
  }

  const record =
    typeof responseBody === "object" && responseBody
      ? (responseBody as Record<string, unknown>)
      : {};
  const success = response.ok && record.success !== false;
  const errorMessage = success
    ? undefined
    : String(record.error ?? record.message ?? `HTTP ${response.status}`);

  const headerEntries: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headerEntries[key] = value;
  });

  console.log("[tripjack-hotel-proxy]", {
    endpoint: input.endpoint,
    method,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    headers: headerEntries,
    url: input.url,
    success,
    errorMessage,
    bodyPreview: rawText.slice(0, 500),
  });

  void logTripJackHotelApiCall({
    endpoint: input.endpoint,
    method,
    correlationId:
      input.correlationId ??
      (typeof record.correlationId === "string" ? record.correlationId : undefined),
    bookingId: input.bookingId,
    userId: input.userId,
    role: input.role,
    requestBody: input.requestBody,
    responseBody,
    httpStatus: response.status,
    success,
    errorCode:
      record.errorCode != null
        ? String(record.errorCode)
        : record.code != null
          ? String(record.code)
          : undefined,
    errorMessage,
    durationMs: Date.now() - started,
  });

  return { response, rawText };
}
