/** IATA code → local logo filename under /public/airlines/ */
const LOGO_FILE_ALIASES: Record<string, string> = {
  GO: "G8",
  I5: "IX",
};

export const AIRLINE_NAMES: Record<string, string> = {
  AI: "Air India",
  "9I": "Alliance Air",
  "6E": "IndiGo",
  SG: "SpiceJet",
  UK: "Vistara",
  I5: "Air India Express",
  IX: "Air India Express",
  G8: "Go First",
  GO: "Go First",
  QP: "Akasa Air",
};

function normalizeAirlineCode(code: string): string {
  return code.trim().toUpperCase();
}

function resolveLogoFileCode(code: string): string | null {
  const normalized = normalizeAirlineCode(code);
  if (!normalized || normalized.length < 2) return null;
  return LOGO_FILE_ALIASES[normalized] ?? normalized;
}

/** Primary logo URL (.png). Use {@link getAirlineLogoSources} for png → svg fallbacks. */
export function getAirlineLogo(code: string): string | null {
  const fileCode = resolveLogoFileCode(code);
  if (!fileCode) return null;
  return `/airlines/${fileCode}.png`;
}

/** Ordered local paths: png first, then svg. Missing files fall back via img onError. */
export function getAirlineLogoSources(code: string): string[] {
  const fileCode = resolveLogoFileCode(code);
  if (!fileCode) return [];
  return [`/airlines/${fileCode}.png`, `/airlines/${fileCode}.svg`];
}

export function getAirlineDisplayName(code: string, fallback?: string): string {
  const normalized = normalizeAirlineCode(code);
  return AIRLINE_NAMES[normalized] ?? AIRLINE_NAMES[LOGO_FILE_ALIASES[normalized] ?? ""] ?? fallback ?? normalized;
}
