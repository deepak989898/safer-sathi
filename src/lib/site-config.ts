const PRODUCTION_APP_URL = "https://thesafarsathi.com";
const APEX_HOST = "thesafarsathi.com";
const WWW_HOST = "www.thesafarsathi.com";

/** Use apex domain (no www) for thesafarsathi.com in production URLs. */
export function normalizeProductionSiteUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === WWW_HOST) {
      parsed.hostname = APEX_HOST;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** Canonical public site URL (custom domain in production). */
export function getAppUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) {
    return normalizeProductionSiteUrl(configured);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    const raw = vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
    return normalizeProductionSiteUrl(raw);
  }

  return PRODUCTION_APP_URL;
}

export function appUrl(path = ""): string {
  const base = getAppUrl();
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Safar Sathi";

/** Primary production hostname (no www). */
export const PRODUCTION_DOMAIN = APEX_HOST;
/** Legacy www hostname — redirects to apex. */
export const WWW_DOMAIN = WWW_HOST;

/** @deprecated Use PRODUCTION_DOMAIN */
export const APEX_DOMAIN = APEX_HOST;

/** Public contact details shown on the live site */
export const SITE_CONTACT = {
  phone: "+91 9217290871",
  phoneTel: "+919217290871",
  email: "support@thesafarsathi.com",
  addressLine1: "352 Travel Hub, Connaught Place",
  addressLine2: "New Delhi 110001, India",
  addressFull: "352 Travel Hub, Connaught Place, New Delhi 110001, India",
  whatsappUrl: "https://wa.me/919217290871",
} as const;

export const MOBILE_HOME_SHOWCASE_LIMIT = 20;
