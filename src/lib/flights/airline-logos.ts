/** IATA code → local logo filename under /public/airlines/ */
const LOGO_FILE_ALIASES: Record<string, string> = {
  GO: "G8",
};

export const AIRLINE_NAMES: Record<string, string> = {
  AI: "Air India",
  "9I": "Alliance Air",
  "6E": "IndiGo",
  SG: "SpiceJet",
  UK: "Vistara",
  I5: "AirAsia India",
  IX: "Air India Express",
  G8: "Go First",
  GO: "Go First",
  QP: "Akasa Air",
  S2: "JetLite",
  DN: "Air Deccan",
};

export type AirlineBrandStyle = {
  bg: string;
  text: string;
  ring: string;
};

/** Brand colors for polished code fallback badges. */
export const AIRLINE_BRAND_STYLES: Record<string, AirlineBrandStyle> = {
  "6E": { bg: "#000099", text: "#FFFFFF", ring: "#C7D2FE" },
  AI: { bg: "#8B1538", text: "#F9A11B", ring: "#FECDD3" },
  IX: { bg: "#F36F21", text: "#FFFFFF", ring: "#FED7AA" },
  I5: { bg: "#E4002B", text: "#FFFFFF", ring: "#FECACA" },
  "9I": { bg: "#003DA5", text: "#FFFFFF", ring: "#BFDBFE" },
  SG: { bg: "#EF4023", text: "#FFFFFF", ring: "#FECACA" },
  UK: { bg: "#5C0632", text: "#FFFFFF", ring: "#F5D0FE" },
  G8: { bg: "#00A651", text: "#FFFFFF", ring: "#BBF7D0" },
  GO: { bg: "#00A651", text: "#FFFFFF", ring: "#BBF7D0" },
  QP: { bg: "#5B2C82", text: "#FFFFFF", ring: "#E9D5FF" },
};

function normalizeAirlineCode(code: string): string {
  return code.trim().toUpperCase();
}

function resolveLogoFileCode(code: string): string | null {
  const normalized = normalizeAirlineCode(code);
  if (!normalized || normalized.length < 2) return null;
  return LOGO_FILE_ALIASES[normalized] ?? normalized;
}

/** TripJack `aI` object — no logo in samples; keep for forward compatibility. */
export function extractTripJackAirlineLogoUrl(airline: unknown): string | undefined {
  const record =
    airline && typeof airline === "object" && !Array.isArray(airline)
      ? (airline as Record<string, unknown>)
      : null;
  if (!record) return undefined;

  for (const key of ["logo", "logoUrl", "image", "imageUrl", "icon", "iconUrl", "airlineLogo"]) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("//")) {
      return trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
    }
  }
  return undefined;
}

function kiwiAirlineLogoUrl(code: string, size: 64 | 32 = 64): string {
  return `https://images.kiwi.com/airlines/${size}/${normalizeAirlineCode(code)}.png`;
}

/**
 * Ordered logo sources: TripJack URL → CDN → local SVG.
 * Kiwi CDN provides real airline marks; local SVG is a branded fallback.
 */
export function getAirlineLogoSources(code: string, apiLogoUrl?: string | null): string[] {
  const normalized = normalizeAirlineCode(code);
  if (!normalized) return [];

  const sources: string[] = [];
  const api = apiLogoUrl?.trim();
  if (api && (api.startsWith("http://") || api.startsWith("https://"))) {
    sources.push(api);
  }

  sources.push(kiwiAirlineLogoUrl(normalized, 64));
  sources.push(kiwiAirlineLogoUrl(normalized, 32));

  const fileCode = resolveLogoFileCode(normalized);
  if (fileCode) {
    sources.push(`/airlines/${fileCode}.svg`);
  }

  return [...new Set(sources)];
}

export function getAirlineBrandStyle(code: string): AirlineBrandStyle {
  const normalized = normalizeAirlineCode(code);
  const alias = LOGO_FILE_ALIASES[normalized];
  return (
    AIRLINE_BRAND_STYLES[normalized] ??
    AIRLINE_BRAND_STYLES[alias ?? ""] ?? {
      bg: "#EFF6FF",
      text: "#1A4FA3",
      ring: "#BFDBFE",
    }
  );
}

export function getAirlineDisplayName(code: string, fallback?: string): string {
  const normalized = normalizeAirlineCode(code);
  return (
    AIRLINE_NAMES[normalized] ??
    AIRLINE_NAMES[LOGO_FILE_ALIASES[normalized] ?? ""] ??
    fallback ??
    normalized
  );
}

/** @deprecated Use getAirlineLogoSources */
export function getAirlineLogo(code: string): string | null {
  const sources = getAirlineLogoSources(code);
  return sources[0] ?? null;
}
