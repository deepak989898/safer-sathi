/** Shown in admin when TripJack denies static catalogue but VPS proxy route works. */
export const TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE =
  "TripJack HMS Static Content API access is not enabled for this API key. Contact TripJack support. Dynamic booking can still work if listing/pricing/review/book are enabled.";

export const TRIPJACK_STATIC_CATALOGUE_403_UPSTREAM_ERROR =
  "TripJack upstream returned 403 empty body. Verify HMS Static Content API access, API key permission and IP whitelist.";

export function isTripJackStaticCatalogue403(input: {
  upstreamStatus?: number;
  proxyRouteOk?: boolean;
}): boolean {
  return input.upstreamStatus === 403 && input.proxyRouteOk !== false;
}
