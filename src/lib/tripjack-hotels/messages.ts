/** Shown in admin when TripJack denies V3 static content APIs but VPS proxy route works. */
export const TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE =
  "TripJack static content API permission issue or endpoint blocked. Contact TripJack support to enable fetch-hotel-mapping and fetch-hotel-content. Dynamic booking can still work if listing/pricing/review/book are enabled.";

export const TRIPJACK_STATIC_CATALOGUE_403_UPSTREAM_ERROR =
  "TripJack static content API permission issue or endpoint blocked. Verify HMS V3 content API access, API key permission and IP whitelist.";

export function isTripJackStaticCatalogue403(input: {
  upstreamStatus?: number;
  proxyRouteOk?: boolean;
}): boolean {
  return input.upstreamStatus === 403 && input.proxyRouteOk !== false;
}
