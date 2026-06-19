import type { UserLocationInfo } from "@/types/travel-manager";
import { detectIndiaRegion } from "@/lib/ai/travel-manager/geo-language";

interface IpApiResponse {
  status?: string;
  country?: string;
  regionName?: string;
  city?: string;
  timezone?: string;
  query?: string;
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip && !isPrivateIp(ip)) return ip;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && !isPrivateIp(realIp)) return realIp;
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp && !isPrivateIp(cfIp)) return cfIp;
  return null;
}

function isPrivateIp(ip: string): boolean {
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.")
  );
}

export async function fetchIpGeolocation(ip: string | null): Promise<UserLocationInfo | null> {
  if (!ip) return null;

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,timezone,query`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as IpApiResponse;
    if (data.status !== "success") return null;

    const location: UserLocationInfo = {
      country: data.country,
      state: data.regionName,
      city: data.city,
      timezone: data.timezone,
      ip: data.query ?? ip,
      source: "ip",
    };
    location.region = detectIndiaRegion(location.state, location.city);
    return location;
  } catch (error) {
    console.warn("IP geolocation failed:", error);
    return null;
  }
}

export function buildLocationFromBrowser(input: {
  timezone?: string;
  browserLanguage?: string;
}): UserLocationInfo | null {
  if (!input.timezone && !input.browserLanguage) return null;

  const tz = input.timezone ?? "";
  let city: string | undefined;
  let state: string | undefined;

  if (tz.includes("Kolkata") || tz.includes("Calcutta")) {
    city = "Kolkata";
    state = "West Bengal";
  } else if (tz.includes("Mumbai")) {
    city = "Mumbai";
    state = "Maharashtra";
  } else if (tz.includes("Chennai")) {
    city = "Chennai";
    state = "Tamil Nadu";
  } else if (tz.includes("Bangalore")) {
    city = "Bangalore";
    state = "Karnataka";
  } else if (tz.includes("Delhi") || tz === "Asia/Kolkata") {
    city = "Delhi";
    state = "Delhi";
  }

  if (!city && !state) return { timezone: tz, source: "browser" };

  const location: UserLocationInfo = {
    city,
    state,
    country: "India",
    timezone: tz,
    source: "browser",
  };
  location.region = detectIndiaRegion(state, city);
  return location;
}

export async function resolveUserLocation(
  request: Request,
  browserHints?: { timezone?: string; browserLanguage?: string }
): Promise<UserLocationInfo> {
  const ip = getClientIp(request);
  const fromIp = await fetchIpGeolocation(ip);
  if (fromIp) return fromIp;

  const fromBrowser = buildLocationFromBrowser(browserHints ?? {});
  if (fromBrowser) return fromBrowser;

  return {
    country: "India",
    source: "default",
    region: "other",
  };
}
