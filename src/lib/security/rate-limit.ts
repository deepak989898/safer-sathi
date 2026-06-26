import { NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

const MAX_BUCKETS = 10_000;

function pruneBuckets(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, entry] of buckets) {
    if (now >= entry.resetAt) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  pruneBuckets(now);

  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function apiRateLimited(resetAt: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    {
      success: false,
      error: "Too many attempts. Please try again later.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

/** Booking login: limit brute-force of email + booking ID pairs */
export const BOOKING_LOGIN_IP_LIMIT = 10;
export const BOOKING_LOGIN_IP_WINDOW_MS = 15 * 60 * 1000;
export const BOOKING_LOGIN_EMAIL_LIMIT = 5;
export const BOOKING_LOGIN_EMAIL_WINDOW_MS = 15 * 60 * 1000;

export function checkBookingLoginRateLimit(
  request: Request,
  email: string
): RateLimitResult | null {
  const ip = getClientIp(request);
  const normalizedEmail = email.toLowerCase().trim();

  const ipResult = checkRateLimit(
    `booking-login:ip:${ip}`,
    BOOKING_LOGIN_IP_LIMIT,
    BOOKING_LOGIN_IP_WINDOW_MS
  );
  if (!ipResult.allowed) return ipResult;

  const emailResult = checkRateLimit(
    `booking-login:email:${normalizedEmail}`,
    BOOKING_LOGIN_EMAIL_LIMIT,
    BOOKING_LOGIN_EMAIL_WINDOW_MS
  );
  if (!emailResult.allowed) return emailResult;

  return null;
}
