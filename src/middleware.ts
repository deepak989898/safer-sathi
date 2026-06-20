import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PRODUCTION_DOMAIN } from "@/lib/site-config";

const CANONICAL_HOST = PRODUCTION_DOMAIN;

function shouldRedirectToCanonical(host: string): boolean {
  const normalized = host.toLowerCase();
  if (normalized === CANONICAL_HOST) return false;
  if (normalized.endsWith(".vercel.app")) return true;
  if (normalized === "thesafarsathi.com") return true;
  return false;
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") ?? "";

  if (shouldRedirectToCanonical(host)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\..*).*)"],
};
