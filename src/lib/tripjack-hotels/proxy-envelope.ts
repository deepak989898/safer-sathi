/** Parse VPS proxy JSON envelope: { success, data, upstreamUrl, upstreamStatus, error }. */

export interface ParsedTripJackProxyResponse<T = unknown> {
  data: T;
  upstreamUrl: string;
  upstreamStatus: number;
  proxyHttpStatus: number;
  success: boolean;
  error?: string;
  rawPreview?: string;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function previewRaw(value: unknown, max = 300): string {
  if (typeof value === "string") return value.slice(0, max);
  try {
    return JSON.stringify(value).slice(0, max);
  } catch {
    return String(value).slice(0, max);
  }
}

export function parseTripJackProxyJson(
  rawText: string,
  proxyUrl: string,
  proxyHttpStatus: number
): { parsed: unknown; parseError?: string } {
  try {
    return { parsed: JSON.parse(rawText) };
  } catch {
    const isMissingRoute =
      proxyHttpStatus === 404 &&
      (rawText.includes("Cannot POST") ||
        rawText.includes("Cannot GET") ||
        rawText.includes("<!DOCTYPE html>"));
    return {
      parsed: null,
      parseError: isMissingRoute
        ? `TripJack hotel proxy route missing on VPS (${proxyUrl}). Paste docs/tripjack-vps-hotel-all-routes.js into server.js and run: pm2 restart tripjack-proxy --update-env`
        : formatNonJsonProxyError(proxyHttpStatus, rawText),
    };
  }
}

function formatNonJsonProxyError(status: number, rawText: string): string {
  const contentType = rawText.trim().startsWith("<") ? "text/html" : "text/plain";
  return [
    "TripJack returned non JSON response.",
    `Status: ${status}`,
    `Content-Type: ${contentType}`,
    `Body preview:\n${rawText.slice(0, 500) || "(empty)"}`,
  ].join("\n");
}

export function unwrapTripJackProxyEnvelope<T = unknown>(
  raw: unknown,
  proxyUrl: string,
  proxyHttpStatus: number
): ParsedTripJackProxyResponse<T> {
  const envelope = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const upstreamUrl = asString(envelope.upstreamUrl) || proxyUrl;
  const upstreamStatus = Number(envelope.upstreamStatus ?? proxyHttpStatus);
  const success = proxyHttpStatus >= 200 && proxyHttpStatus < 300 && envelope.success !== false;
  const error =
    asString(envelope.error) ||
    asString((envelope.data as Record<string, unknown> | undefined)?.message) ||
    undefined;

  const inner = envelope.data !== undefined ? envelope.data : envelope;

  return {
    data: inner as T,
    upstreamUrl,
    upstreamStatus,
    proxyHttpStatus,
    success,
    error: success ? undefined : error || `TripJack hotel proxy failed (HTTP ${proxyHttpStatus})`,
    rawPreview: previewRaw(envelope.upstreamData ?? inner),
  };
}

export function extractTripJackUpstreamData<T = unknown>(data: unknown): T {
  if (!data || typeof data !== "object") return data as T;
  const record = data as Record<string, unknown>;
  if (record.data !== undefined && typeof record.data === "object") {
    return record.data as T;
  }
  return data as T;
}
