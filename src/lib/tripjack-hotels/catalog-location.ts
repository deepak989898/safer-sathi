import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";

const INDIA_PATTERN = /\b(india|ind|bharat)\b/i;

export const FEATURED_POPULAR_CITIES = [
  "Goa",
  "Delhi",
  "Mumbai",
  "Jaipur",
  "Udaipur",
  "Manali",
  "Agra",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
] as const;

type PopularCityDef = {
  key: string;
  display: string;
  aliases: string[];
};

const POPULAR_CITY_DEFS: PopularCityDef[] = [
  { key: "goa", display: "Goa", aliases: ["goa", "panaji", "panjim", "calangute", "candolim", "baga", "anjuna", "mapusa", "vasco"] },
  { key: "delhi", display: "Delhi", aliases: ["delhi", "new delhi", "ncr", "aerocity", "connaught", "karol bagh", "paharganj"] },
  { key: "mumbai", display: "Mumbai", aliases: ["mumbai", "bombay", "bandra", "andheri", "juhu", "powai", "colaba", "worli"] },
  { key: "jaipur", display: "Jaipur", aliases: ["jaipur", "pink city"] },
  { key: "udaipur", display: "Udaipur", aliases: ["udaipur", "lake pichola"] },
  { key: "manali", display: "Manali", aliases: ["manali", "old manali"] },
  { key: "agra", display: "Agra", aliases: ["agra", "taj ganj"] },
  { key: "bengaluru", display: "Bengaluru", aliases: ["bengaluru", "bangalore", "koramangala", "indiranagar", "whitefield"] },
  { key: "hyderabad", display: "Hyderabad", aliases: ["hyderabad", "hitech city", "gachibowli", "banjara hills"] },
  { key: "chennai", display: "Chennai", aliases: ["chennai", "madras", "t nagar", "adyar"] },
  { key: "kolkata", display: "Kolkata", aliases: ["kolkata", "calcutta", "howrah", "park street"] },
  { key: "shimla", display: "Shimla", aliases: ["shimla", "simla"] },
  { key: "pune", display: "Pune", aliases: ["pune", "poona", "koregaon"] },
];

const CITY_ALIAS_TO_KEY: Record<string, string> = {};
for (const def of POPULAR_CITY_DEFS) {
  for (const alias of def.aliases) {
    CITY_ALIAS_TO_KEY[alias] = def.key;
  }
  CITY_ALIAS_TO_KEY[def.key] = def.key;
  CITY_ALIAS_TO_KEY[def.display.toLowerCase()] = def.key;
}

export function isGenericIndiaLabel(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return INDIA_PATTERN.test(trimmed) && trimmed.replace(INDIA_PATTERN, "").trim().length === 0;
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function resolvePopularCityKey(text: string): string | null {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;

  if (CITY_ALIAS_TO_KEY[lower]) return CITY_ALIAS_TO_KEY[lower];

  for (const def of POPULAR_CITY_DEFS) {
    for (const alias of def.aliases) {
      if (lower === alias || lower.includes(alias)) return def.key;
    }
  }
  return null;
}

export function popularCityDisplayName(key: string): string {
  const def = POPULAR_CITY_DEFS.find((item) => item.key === key);
  return def?.display ?? titleCaseWords(key);
}

function extractCityFromHotelName(name: string): string | null {
  const patterns = [
    /\bin\s+([A-Za-z][A-Za-z\s'-]{1,40}?)(?:\s*[–\-|,]|$)/i,
    /,\s*([A-Za-z][A-Za-z\s'-]{2,30})\s*$/i,
    /\bat\s+([A-Za-z][A-Za-z\s'-]{2,30})(?:\s*[–\-|,]|$)/i,
  ];
  for (const pattern of patterns) {
    const match = name.match(pattern);
    const candidate = match?.[1]?.trim();
    if (!candidate || isGenericIndiaLabel(candidate)) continue;
    const key = resolvePopularCityKey(candidate);
    if (key) return popularCityDisplayName(key);
    if (candidate.length >= 3 && candidate.length <= 32) return titleCaseWords(candidate);
  }
  return null;
}

function parseAddressParts(address: string): string[] {
  return address
    .split(/[,|/]/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !isGenericIndiaLabel(part));
}

function matchCityInParts(parts: string[]): { city: string; cityKey: string; locality?: string } | null {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    const key = resolvePopularCityKey(part);
    if (!key) continue;
    const locality = index > 0 ? parts[index - 1] : undefined;
    return {
      city: popularCityDisplayName(key),
      cityKey: key,
      locality: locality && !resolvePopularCityKey(locality) ? titleCaseWords(locality) : undefined,
    };
  }
  return null;
}

export interface ResolvedCatalogLocation {
  cityName: string;
  cityKey: string;
  locality?: string;
  displayLocation: string;
}

export function resolveCatalogLocation(
  entry: Pick<
    TripJackHotelCatalogEntry,
    "name" | "cityName" | "region" | "stateName" | "address" | "countryName" | "searchBlob"
  >
): ResolvedCatalogLocation | null {
  const candidates: string[] = [
    entry.cityName,
    entry.region,
    entry.address,
    entry.name,
    entry.searchBlob,
  ].filter((value): value is string => Boolean(value?.trim()));

  let cityName = "";
  let cityKey = "";
  let locality = entry.region?.trim() || undefined;

  for (const candidate of [entry.cityName, entry.region, entry.stateName]) {
    if (!candidate?.trim() || isGenericIndiaLabel(candidate)) continue;
    const key = resolvePopularCityKey(candidate);
    if (key) {
      cityKey = key;
      cityName = popularCityDisplayName(key);
      break;
    }
    if (!cityName && candidate.length >= 2 && candidate.length <= 40 && !isGenericIndiaLabel(candidate)) {
      cityName = titleCaseWords(candidate);
      cityKey = candidate.toLowerCase();
    }
  }

  if (!cityName && entry.address?.trim()) {
    const fromAddress = matchCityInParts(parseAddressParts(entry.address));
    if (fromAddress) {
      cityName = fromAddress.city;
      cityKey = fromAddress.cityKey;
      locality = locality || fromAddress.locality;
    }
  }

  if (!cityName) {
    for (const text of candidates) {
      const key = resolvePopularCityKey(text);
      if (key) {
        cityKey = key;
        cityName = popularCityDisplayName(key);
        break;
      }
    }
  }

  if (!cityName) {
    const fromName = extractCityFromHotelName(entry.name);
    if (fromName) {
      const key = resolvePopularCityKey(fromName) ?? fromName.toLowerCase();
      cityKey = key;
      cityName = resolvePopularCityKey(fromName) ? popularCityDisplayName(key) : fromName;
    }
  }

  if (!cityName || isGenericIndiaLabel(cityName)) return null;

  if (!locality && entry.address?.trim()) {
    const parts = parseAddressParts(entry.address);
    const match = matchCityInParts(parts);
    if (match?.locality) locality = match.locality;
    else if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      const key = resolvePopularCityKey(last);
      if (key && parts.length >= 2) {
        const maybeLocality = parts[parts.length - 2];
        if (maybeLocality && !resolvePopularCityKey(maybeLocality)) {
          locality = titleCaseWords(maybeLocality);
        }
      }
    }
  }

  if (locality && resolvePopularCityKey(locality) === cityKey) {
    locality = undefined;
  }

  const displayLocation = locality && locality.toLowerCase() !== cityName.toLowerCase()
    ? `${locality}, ${cityName}`
    : cityName;

  if (isGenericIndiaLabel(displayLocation)) return null;

  return {
    cityName,
    cityKey: cityKey || cityName.toLowerCase(),
    locality,
    displayLocation,
  };
}

export function enrichCatalogEntryLocation(
  entry: TripJackHotelCatalogEntry
): TripJackHotelCatalogEntry {
  const resolved = resolveCatalogLocation(entry);
  if (!resolved) return entry;

  const cityName = resolved.cityName;
  const region = resolved.locality || entry.region;
  const searchBlob = [
    entry.name,
    cityName,
    region ?? "",
    entry.stateName ?? "",
    entry.countryName,
    entry.address,
    entry.propertyType ?? "",
    entry.description ?? "",
  ]
    .map((part) => part.toLowerCase().trim())
    .filter(Boolean)
    .join(" ");

  return {
    ...entry,
    cityName,
    cityNameLower: cityName.toLowerCase(),
    region: region || entry.region,
    searchBlob,
  };
}

export function formatFeaturedCardLocation(entry: TripJackHotelCatalogEntry): ResolvedCatalogLocation | null {
  const enriched = enrichCatalogEntryLocation(entry);
  return resolveCatalogLocation(enriched);
}
