import "server-only";

import { getTripJackHotelProxyConfig, getTripJackHotelProxyBaseUrl } from "@/lib/tripjack-hotels/config";
import { tripJackHotelProxyFetch } from "@/lib/tripjack-hotels/api-logging";
import {
  parseTripJackProxyJson,
  unwrapTripJackProxyEnvelope,
} from "@/lib/tripjack-hotels/proxy-envelope";

import type { ProxyRouteTestResult } from "@/lib/tripjack-hotels/proxy-types";

function preview(text: string, max = 300): string {
  return text.slice(0, max);
}

async function runOne(input: {
  name: string;
  url: string;
  method: "GET" | "POST";
  body?: Record<string, unknown>;
}): Promise<ProxyRouteTestResult> {
  const base: ProxyRouteTestResult = {
    name: input.name,
    ok: false,
    proxyUrl: input.url,
    method: input.method,
    httpStatus: 0,
    preview: "",
  };

  try {
    const { response, rawText } = await tripJackHotelProxyFetch({
      endpoint: `proxy-test:${input.name}`,
      url: input.url,
      method: input.method,
      requestBody: input.method === "POST" ? (input.body ?? {}) : undefined,
    });

    base.httpStatus = response.status;
    base.preview = preview(rawText);

    const { parsed, parseError } = parseTripJackProxyJson(rawText, input.url, response.status);
    if (parseError) {
      return { ...base, error: parseError, preview: preview(rawText) };
    }

    const envelope = unwrapTripJackProxyEnvelope(parsed, input.url, response.status);
    base.upstreamStatus = envelope.upstreamStatus;
    base.upstreamUrl = envelope.upstreamUrl;
    base.ok = envelope.success;
    base.error = envelope.error;
    if (!base.preview || base.preview.length < 10) {
      base.preview = envelope.rawPreview ?? preview(JSON.stringify(envelope.data));
    }
    return base;
  } catch (e) {
    return {
      ...base,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}

/** Super-admin diagnostics — tests VPS proxy routes (never calls TripJack from browser). */
export async function runTripJackHotelProxyRouteTests(): Promise<{
  proxyBaseUrl: string;
  results: ProxyRouteTestResult[];
}> {
  const baseUrl = getTripJackHotelProxyBaseUrl();
  const config = getTripJackHotelProxyConfig();

  const healthUrl = `${baseUrl}/health`;
  const rootUrl = `${baseUrl}/`;

  const healthResult = await runOne({ name: "health", url: healthUrl, method: "GET" });
  const results: ProxyRouteTestResult[] = [
    healthResult.ok ? healthResult : await runOne({ name: "root", url: rootUrl, method: "GET" }),
    await runOne({ name: "nationalities", url: config.nationalitiesUrl, method: "GET" }),
    await runOne({
      name: "fetch-static-hotels",
      url: config.fetchStaticHotelsUrl,
      method: "POST",
      body: {},
    }),
  ];

  return { proxyBaseUrl: baseUrl, results };
}
