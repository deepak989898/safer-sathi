import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PRODUCTION_DOMAIN, WWW_DOMAIN } from "@/lib/site-config";

const ALLOWED_ORIGINS = new Set([
  `https://${PRODUCTION_DOMAIN}`,
  `https://${WWW_DOMAIN}`,
]);

function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowOrigin =
    origin && ALLOWED_ORIGINS.has(origin) ? origin : `https://${WWW_DOMAIN}`;

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-User-Id, X-User-Role, X-User-Email",
    Vary: "Origin",
  };
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api/");

  if (isApi && request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }

  const response = NextResponse.next();
  if (isApi) {
    for (const [key, value] of Object.entries(corsHeaders(request))) {
      response.headers.set(key, value);
    }
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
