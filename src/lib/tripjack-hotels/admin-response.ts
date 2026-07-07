import { adminApiFetch } from "@/lib/admin/api-client";

const BODY_PREVIEW_LEN = 500;

export interface TripJackParsedHttpBody {
  parsed: unknown;
  rawText: string;
  contentType: string;
  status: number;
  parseError?: string;
}

export function formatTripJackNonJsonError(input: {
  status: number;
  contentType: string;
  body: string;
  context?: string;
}): string {
  const preview = input.body.substring(0, BODY_PREVIEW_LEN);
  return [
    input.context ?? "TripJack returned non JSON response.",
    `Status: ${input.status}`,
    `Content-Type: ${input.contentType || "(none)"}`,
    `Body preview:\n${preview || "(empty)"}`,
  ].join("\n");
}

function shouldAttemptJsonParse(contentType: string, rawText: string): boolean {
  const trimmed = rawText.trim();
  if (!trimmed) return true;
  if (contentType.toLowerCase().includes("application/json")) return true;
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

/** Safe response parser — never calls response.json() directly. */
export async function parseTripJackHttpResponse(
  response: Response,
  context?: string
): Promise<TripJackParsedHttpBody> {
  const contentType = response.headers.get("content-type") ?? "";
  const status = response.status;
  const rawText = await response.text();

  const headerEntries: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headerEntries[key] = value;
  });

  console.log("[tripjack-admin-response]", {
    context: context ?? "tripjack-admin",
    status,
    contentType,
    url: response.url,
    headers: headerEntries,
    bodyPreview: rawText.slice(0, BODY_PREVIEW_LEN),
  });

  if (!shouldAttemptJsonParse(contentType, rawText)) {
    return {
      parsed: null,
      rawText,
      contentType,
      status,
      parseError: formatTripJackNonJsonError({ status, contentType, body: rawText, context }),
    };
  }

  try {
    const parsed = rawText.trim() ? JSON.parse(rawText) : {};
    return { parsed, rawText, contentType, status };
  } catch {
    return {
      parsed: null,
      rawText,
      contentType,
      status,
      parseError: formatTripJackNonJsonError({ status, contentType, body: rawText, context }),
    };
  }
}

export interface TripJackAdminApiResult<T> {
  ok: boolean;
  status: number;
  contentType: string;
  data?: T;
  error?: string;
  details?: unknown;
  rawPreview?: string;
}

function buildSyncErrorMessage(json: Record<string, unknown>): string {
  const details = (json.details ?? {}) as Record<string, unknown>;
  const parts: string[] = [];

  const adminMessage = details.adminMessage ?? json.error;
  if (adminMessage) parts.push(String(adminMessage));

  if (details.bookingFlowUnblocked) {
    parts.push("VPS proxy route is OK — dynamic booking may still work.");
  }
  if (details.upstreamUrl) {
    parts.push(`Upstream: ${details.upstreamStatus ?? "?"} @ ${details.upstreamUrl}`);
  }
  if (details.rawPreview) {
    parts.push(`Upstream body:\n${String(details.rawPreview).slice(0, BODY_PREVIEW_LEN)}`);
  }
  if (details.raw && typeof details.raw === "object") {
    parts.push(`Raw:\n${JSON.stringify(details.raw).slice(0, BODY_PREVIEW_LEN)}`);
  }

  return parts.join("\n\n") || "Sync failed";
}

/** Shared admin API caller for TripJack sync/test/proxy routes. */
export async function tripjackAdminApiCall<T = unknown>(
  url: string,
  init?: RequestInit,
  context?: string
): Promise<TripJackAdminApiResult<T>> {
  let response: Response;
  try {
    response = await adminApiFetch(url, init);
  } catch (error) {
    const networkMessage =
      error instanceof Error ? error.message : "Network request failed";
    const friendly =
      networkMessage === "Failed to fetch"
        ? [
            "Network error: the browser could not reach the server.",
            "If this happened during a long sync, use the chunked sync flow (mapping/content batches).",
            `Details: ${networkMessage}`,
          ].join("\n")
        : networkMessage;

    console.error("[tripjack-admin-response] network error:", { context, error: friendly });

    return {
      ok: false,
      status: 0,
      contentType: "",
      error: friendly,
    };
  }

  const parsed = await parseTripJackHttpResponse(response, context);

  if (parsed.parseError) {
    return {
      ok: false,
      status: parsed.status,
      contentType: parsed.contentType,
      error: parsed.parseError,
      rawPreview: parsed.rawText.slice(0, BODY_PREVIEW_LEN),
    };
  }

  const json = (parsed.parsed ?? {}) as Record<string, unknown>;

  if (!response.ok || json.success === false) {
    return {
      ok: false,
      status: parsed.status,
      contentType: parsed.contentType,
      error: buildSyncErrorMessage(json),
      details: json.details,
      rawPreview: parsed.rawText.slice(0, BODY_PREVIEW_LEN),
    };
  }

  return {
    ok: true,
    status: parsed.status,
    contentType: parsed.contentType,
    data: json.data as T,
  };
}
