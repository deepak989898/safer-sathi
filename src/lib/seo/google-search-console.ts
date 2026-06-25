import { JWT } from "google-auth-library";
import { resolveFirebaseAdminCredentials } from "@/lib/firebase/resolve-admin-credentials";
import { getAppUrl } from "@/lib/site-config";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const GSC_API = "https://www.googleapis.com/webmasters/v3";
const CACHE_MS = 15 * 60 * 1000;
const DEFAULT_DAYS = 7;

export interface GscSearchPerformance {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
  connected: boolean;
  period: string;
  siteUrl: string | null;
  message: string;
}

interface GscCredentials {
  clientEmail: string;
  privateKey: string;
}

let performanceCache: { key: string; data: GscSearchPerformance; at: number } | null = null;

function resolveGscCredentials(): GscCredentials | null {
  const dedicatedEmail = process.env.GSC_CLIENT_EMAIL?.trim();
  const dedicatedKey = process.env.GSC_PRIVATE_KEY?.trim();
  if (dedicatedEmail && dedicatedKey) {
    return {
      clientEmail: dedicatedEmail,
      privateKey: dedicatedKey.replace(/\\n/g, "\n"),
    };
  }

  const dedicatedJson = process.env.GSC_SERVICE_ACCOUNT_JSON?.trim();
  if (dedicatedJson?.startsWith("{")) {
    try {
      const json = JSON.parse(dedicatedJson) as {
        client_email?: string;
        private_key?: string;
      };
      if (json.client_email && json.private_key) {
        return {
          clientEmail: json.client_email,
          privateKey: json.private_key.replace(/\\n/g, "\n"),
        };
      }
    } catch {
      /* fall through */
    }
  }

  const firebase = resolveFirebaseAdminCredentials();
  if (!firebase) return null;
  return {
    clientEmail: firebase.clientEmail,
    privateKey: firebase.privateKey,
  };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateRange(days: number): { startDate: string; endDate: string; label: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - (days - 1));
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
    label: `Last ${days} days`,
  };
}

function configuredSiteCandidates(): string[] {
  const configured = process.env.GSC_SITE_URL?.trim();
  const base = getAppUrl().replace(/\/$/, "");
  const host = new URL(base).hostname;

  const candidates = new Set<string>();
  if (configured) candidates.add(configured);

  candidates.add(`${base}/`);
  candidates.add(`${base}`);
  candidates.add(`sc-domain:${host.replace(/^www\./, "")}`);
  if (!host.startsWith("www.")) {
    candidates.add(`https://www.${host}/`);
  }

  return [...candidates];
}

async function getAccessToken(credentials: GscCredentials): Promise<string> {
  const client = new JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: [GSC_SCOPE],
  });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Unable to obtain Google access token");
  return token;
}

async function gscFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GSC_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GSC API ${res.status}: ${body.slice(0, 300)}`);
  }

  return (await res.json()) as T;
}

async function resolveSiteUrl(
  token: string,
  candidates: string[]
): Promise<string | null> {
  const data = await gscFetch<{ siteEntry?: { siteUrl: string }[] }>(token, "/sites");
  const entries = data.siteEntry ?? [];
  if (entries.length === 0) return null;

  for (const candidate of candidates) {
    const match = entries.find((entry) => entry.siteUrl === candidate);
    if (match) return match.siteUrl;
  }

  const appHost = new URL(getAppUrl()).hostname.replace(/^www\./, "");
  const fuzzy = entries.find((entry) => entry.siteUrl.includes(appHost));
  return fuzzy?.siteUrl ?? entries[0]?.siteUrl ?? null;
}

async function queryPerformance(
  token: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<{ clicks: number; impressions: number; ctr: number; position: number | null }> {
  const encodedSite = encodeURIComponent(siteUrl);
  const data = await gscFetch<{ rows?: { clicks: number; impressions: number; ctr: number; position: number }[] }>(
    token,
    `/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: "POST",
      body: JSON.stringify({
        startDate,
        endDate,
        type: "web",
      }),
    }
  );

  const row = data.rows?.[0];
  if (!row) {
    return { clicks: 0, impressions: 0, ctr: 0, position: null };
  }

  return {
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: Math.round((row.ctr ?? 0) * 1000) / 10,
    position: row.position != null ? Math.round(row.position * 10) / 10 : null,
  };
}

function disconnected(message: string): GscSearchPerformance {
  return {
    clicks: 0,
    impressions: 0,
    ctr: 0,
    position: null,
    connected: false,
    period: `Last ${DEFAULT_DAYS} days`,
    siteUrl: null,
    message,
  };
}

export async function fetchGoogleSearchConsolePerformance(
  days = DEFAULT_DAYS
): Promise<GscSearchPerformance> {
  const credentials = resolveGscCredentials();
  if (!credentials) {
    return disconnected(
      "Add Firebase Admin credentials on the server, then grant that service account access in Google Search Console."
    );
  }

  const cacheKey = `${credentials.clientEmail}:${days}`;
  if (performanceCache && performanceCache.key === cacheKey && Date.now() - performanceCache.at < CACHE_MS) {
    return performanceCache.data;
  }

  const range = getDateRange(days);

  try {
    const token = await getAccessToken(credentials);
    const siteUrl = await resolveSiteUrl(token, configuredSiteCandidates());

    if (!siteUrl) {
      const result = disconnected(
        `No Search Console property found for this site. Add ${credentials.clientEmail} as a user in GSC, or set GSC_SITE_URL.`
      );
      performanceCache = { key: cacheKey, data: result, at: Date.now() };
      return result;
    }

    const metrics = await queryPerformance(token, siteUrl, range.startDate, range.endDate);
    const result: GscSearchPerformance = {
      ...metrics,
      connected: true,
      period: range.label,
      siteUrl,
      message: `Live data from Google Search Console (${range.label}).`,
    };
    performanceCache = { key: cacheKey, data: result, at: Date.now() };
    return result;
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Unknown error";
    let message =
      "Could not load Search Console data. Enable the Search Console API in Google Cloud and add your service account email as a GSC user.";

    if (raw.includes("403")) {
      message = `Access denied. In Google Search Console → Settings → Users, add ${credentials.clientEmail} with Full permission. Also enable "Google Search Console API" in Google Cloud Console.`;
    } else if (raw.includes("404")) {
      message = "Search Console property not found. Set GSC_SITE_URL to your exact GSC property URL (e.g. https://www.thesafarsathi.com/).";
    }

    const result = disconnected(message);
    performanceCache = { key: cacheKey, data: result, at: Date.now() };
    return result;
  }
}
