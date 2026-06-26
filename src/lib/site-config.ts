const APEX_HOST = "thesafarsathi.com";
const WWW_HOST = "www.thesafarsathi.com";

/**
 * Public site base URL. Does not force www ↔ apex redirects (Vercel handles that).
 * Prefer the host the user is already on in the browser when possible.
 */
export function getAppUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const configured =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return `https://${WWW_HOST}`;
}

export function appUrl(path = ""): string {
  const base = getAppUrl();
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Safar Sathi";

export const PRODUCTION_DOMAIN = APEX_HOST;
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
