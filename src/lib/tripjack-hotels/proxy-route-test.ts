import "server-only";

import { getTripJackHotelProxyConfig, getTripJackHotelProxyBaseUrl } from "@/lib/tripjack-hotels/config";
import { tripJackHotelProxyFetch } from "@/lib/tripjack-hotels/api-logging";
import {
  parseTripJackProxyJson,
  unwrapTripJackProxyEnvelope,
} from "@/lib/tripjack-hotels/proxy-envelope";
import {
  isTripJackStaticCatalogue403,
  TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE,
} from "@/lib/tripjack-hotels/messages";

import type { ProxyRouteTestResult } from "@/lib/tripjack-hotels/proxy-types";

function preview(text: string, max = 300): string {
  return text.slice(0, max);
}

function readProxyRouteOk(parsed: unknown): boolean | undefined {
  if (!parsed || typeof parsed !== "object") return undefined;
  const record = parsed as Record<string, unknown>;
  return record.proxyRouteOk === true ? true : record.proxyRouteOk === false ? false : undefined;
}

function finalizeResult(
  base: ProxyRouteTestResult,
  input: {
    parseError?: string;
    parsed: unknown;
    envelope: ReturnType<typeof unwrapTripJackProxyEnvelope>;
    rawText: string;
    staticCatalogue?: boolean;
  }
): ProxyRouteTestResult {
  const proxyRouteOk = readProxyRouteOk(input.parsed);
  const missingRoute = Boolean(input.parseError?.includes("proxy route missing"));

  if (missingRoute) {
    return {
      ...base,
      ok: false,
      proxyRouteOk: false,
      error: input.parseError,
      preview: preview(input.rawText),
    };
  }

  if (input.parseError) {
    return { ...base, ok: false, error: input.parseError, preview: preview(input.rawText) };
  }

  const routeReachable = true;
  const upstreamStatus = input.envelope.upstreamStatus;
  const upstreamUrl = input.envelope.upstreamUrl;

  if (
    input.staticCatalogue &&
    isTripJackStaticCatalogue403({ upstreamStatus, proxyRouteOk: proxyRouteOk ?? true })
  ) {
    return {
      ...base,
      ok: true,
      proxyRouteOk: true,
      upstreamStatus,
      upstreamUrl,
      warning: TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE,
      error: input.envelope.error,
      preview: input.envelope.rawPreview ?? preview(input.rawText),
    };
  }

  const upstreamOk =
    input.envelope.success ||
    (upstreamStatus >= 400 && upstreamStatus < 500 && routeReachable);

  return {
    ...base,
    ok: upstreamOk,
    proxyRouteOk: proxyRouteOk ?? routeReachable,
    upstreamStatus,
    upstreamUrl,
    error: upstreamOk ? undefined : input.envelope.error,
    preview: input.envelope.rawPreview ?? preview(input.rawText),
  };
}

async function runOne(input: {
  name: string;
  url: string;
  method: "GET" | "POST";
  body?: Record<string, unknown>;
  staticCatalogue?: boolean;
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
      return finalizeResult(base, { parseError, parsed, envelope: unwrapTripJackProxyEnvelope(null, input.url, response.status), rawText, staticCatalogue: input.staticCatalogue });
    }

    const envelope = unwrapTripJackProxyEnvelope(parsed, input.url, response.status);
    return finalizeResult(base, {
      parsed,
      envelope,
      rawText,
      staticCatalogue: input.staticCatalogue,
    });
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
  bookingRoutesOk: boolean;
  staticCatalogueBlocked: boolean;
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
      staticCatalogue: true,
    }),
    await runOne({
      name: "listing",
      url: config.listingUrl,
      method: "POST",
      body: {
        checkIn: "2026-08-01",
        checkOut: "2026-08-03",
        rooms: [{ adults: 2 }],
        hids: [1001],
        currency: "INR",
        nationality: "106",
      },
    }),
    await runOne({
      name: "pricing",
      url: config.pricingUrl,
      method: "POST",
      body: { correlationId: "proxy-test" },
    }),
    await runOne({
      name: "review",
      url: config.reviewUrl,
      method: "POST",
      body: { correlationId: "proxy-test" },
    }),
  ];

  const bookingRouteNames = new Set(["listing", "pricing", "review"]);
  const bookingRoutesOk = results
    .filter((row) => bookingRouteNames.has(row.name))
    .every((row) => row.ok || row.proxyRouteOk);

  const staticRow = results.find((row) => row.name === "fetch-static-hotels");
  const staticCatalogueBlocked = Boolean(staticRow?.warning);

  return { proxyBaseUrl: baseUrl, results, bookingRoutesOk, staticCatalogueBlocked };
}
