const PRODUCTION_APP_URL = "https://www.thesafarsathi.com";

/** Canonical public site URL (custom domain in production). */
export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return PRODUCTION_APP_URL;
}

export function appUrl(path = ""): string {
  const base = getAppUrl();
  if (!path) return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Safar Sathi";

export const PRODUCTION_DOMAIN = "www.thesafarsathi.com";

/** Public contact details shown on the live site */
export const SITE_CONTACT = {
  phone: "+91 9217290871",
  phoneTel: "+919217290871",
  email: "support@thesafarsafari.com",
  addressLine1: "352 Travel Hub, Connaught Place",
  addressLine2: "New Delhi 110001, India",
  addressFull: "352 Travel Hub, Connaught Place, New Delhi 110001, India",
  whatsappUrl: "https://wa.me/919217290871",
} as const;

export const MOBILE_HOME_SHOWCASE_LIMIT = 20;
