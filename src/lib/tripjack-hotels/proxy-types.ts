export interface ProxyRouteTestResult {
  name: string;
  ok: boolean;
  proxyUrl: string;
  method: string;
  httpStatus: number;
  upstreamStatus?: number;
  upstreamUrl?: string;
  preview: string;
  error?: string;
  /** VPS route registered and returned JSON (even if TripJack upstream denied). */
  proxyRouteOk?: boolean;
  /** Expected TripJack-side limitation — does not fail the overall proxy check. */
  warning?: string;
}
