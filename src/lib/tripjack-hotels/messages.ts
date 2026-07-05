/** Shown in admin when TripJack denies static catalogue but VPS proxy route works. */
export const TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE =
  "TripJack returned 403 for static catalogue. Ask TripJack to enable HMS Static Content API for this account.";

export function isTripJackStaticCatalogue403(input: {
  upstreamStatus?: number;
  proxyRouteOk?: boolean;
}): boolean {
  return input.upstreamStatus === 403 && input.proxyRouteOk !== false;
}
