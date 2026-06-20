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
