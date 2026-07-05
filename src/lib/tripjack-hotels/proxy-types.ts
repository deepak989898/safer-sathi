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
}
