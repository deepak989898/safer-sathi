import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";

const INDIA_PATTERN = /\b(india|ind|bharat)\b/i;
const NEAR_PREFIX_PATTERN =
  /^(near|opp\.?|opposite|behind|in front of|close to|next to|adjacent to)\s+/i;

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

function normalizeComparable(value: string): string {
  return value.trim().toLowerCase();
}

function isSamePlace(a: string, b: string): boolean {
  const left = normalizeComparable(a);
  const right = normalizeComparable(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const leftKey = resolvePopularCityKey(left);
  const rightKey = resolvePopularCityKey(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

export function combineLocalityAndCity(locality: string, cityName: string): string {
  const localityTrimmed = locality.trim();
  const cityTrimmed = cityName.trim();
  if (!cityTrimmed) return localityTrimmed;
  if (!localityTrimmed || isSamePlace(localityTrimmed, cityTrimmed)) return cityTrimmed;
  return `${titleCaseWords(localityTrimmed)}, ${titleCaseWords(cityTrimmed)}`;
}

export function isCityOnlyDisplayLocation(displayLocation: string, cityName: string): boolean {
  const display = displayLocation.trim();
  const city = cityName.trim();
  if (!display || !city) return false;
  return isSamePlace(display, city);
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

function cleanLocalityCandidate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || isGenericIndiaLabel(trimmed)) return undefined;
  if (resolvePopularCityKey(trimmed)) return undefined;
  if (/^\d{4,8}$/.test(trimmed)) return undefined;
  if (NEAR_PREFIX_PATTERN.test(trimmed)) return undefined;
  return titleCaseWords(trimmed);
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
      locality: locality ? cleanLocalityCandidate(locality) : undefined,
    };
  }
  return null;
}

export function extractLocalityFromAddress(
  address: string,
  cityName: string,
  stateName?: string
): string | undefined {
  const parts = parseAddressParts(address);
  if (!parts.length) return undefined;

  const cityKey = resolvePopularCityKey(cityName) ?? cityName.toLowerCase();
  const stateLower = stateName?.trim().toLowerCase();

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index];
    const partKey = resolvePopularCityKey(part);
    const matchesCity =
      partKey === cityKey ||
      normalizeComparable(part) === normalizeComparable(cityName);
    if (!matchesCity) continue;

    for (let localityIndex = index - 1; localityIndex >= 0; localityIndex -= 1) {
      const candidate = cleanLocalityCandidate(parts[localityIndex]);
      if (candidate) return candidate;
    }
    break;
  }

  const fromMatch = matchCityInParts(parts);
  if (fromMatch?.locality && !isSamePlace(fromMatch.locality, cityName)) {
    return fromMatch.locality;
  }

  if (stateLower) {
    const withoutState = parts.filter((part) => normalizeComparable(part) !== stateLower);
    if (withoutState.length >= 2) {
      const candidate = cleanLocalityCandidate(withoutState[withoutState.length - 2]);
      if (candidate) return candidate;
    }
  }

  if (parts.length >= 2) {
    const candidate = cleanLocalityCandidate(parts[parts.length - 2]);
    if (candidate && !isSamePlace(candidate, cityName)) return candidate;
  }

  return undefined;
}

export interface ResolvedCatalogLocation {
  cityName: string;
  cityKey: string;
  locality?: string;
  displayLocation: string;
  usedAddressParser?: boolean;
}

type LocationSourceEntry = Pick<
  TripJackHotelCatalogEntry,
  | "name"
  | "cityName"
  | "cityCode"
  | "stateName"
  | "region"
  | "locality"
  | "area"
  | "landmark"
  | "address"
  | "countryName"
  | "displayLocation"
  | "searchBlob"
>;

function resolveCityName(entry: LocationSourceEntry): { cityName: string; cityKey: string } | null {
  const candidates: string[] = [
    entry.cityName,
    entry.region,
    entry.address,
    entry.name,
    entry.searchBlob,
  ].filter((value): value is string => Boolean(value?.trim()));

  let cityName = "";
  let cityKey = "";

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
  return { cityName, cityKey: cityKey || cityName.toLowerCase() };
}

function pickLocalityCandidate(
  value: string | undefined,
  cityName: string
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || isGenericIndiaLabel(trimmed)) return undefined;
  if (isSamePlace(trimmed, cityName)) return undefined;
  if (resolvePopularCityKey(trimmed)) return undefined;
  return titleCaseWords(trimmed);
}

export function resolveCatalogLocation(entry: LocationSourceEntry): ResolvedCatalogLocation | null {
  const city = resolveCityName(entry);
  if (!city) return null;

  const { cityName, cityKey } = city;
  let usedAddressParser = false;

  let locality =
    pickLocalityCandidate(entry.locality, cityName) ||
    pickLocalityCandidate(entry.region, cityName) ||
    pickLocalityCandidate(entry.area, cityName) ||
    pickLocalityCandidate(entry.landmark, cityName);

  if (!locality && entry.address?.trim()) {
    const parsed = extractLocalityFromAddress(entry.address, cityName, entry.stateName);
    if (parsed) {
      locality = parsed;
      usedAddressParser = true;
    }
  }

  const displayLocation = combineLocalityAndCity(locality ?? "", cityName);
  if (isGenericIndiaLabel(displayLocation)) return null;

  return {
    cityName,
    cityKey,
    locality,
    displayLocation,
    usedAddressParser,
  };
}

export function resolveHotelDisplayLocation(entry: LocationSourceEntry): string {
  const stored = entry.displayLocation?.trim();
  if (stored && !isGenericIndiaLabel(stored)) {
    return stored;
  }

  const city = resolveCityName(entry);
  if (!city) return stored || entry.cityName?.trim() || "";

  const { cityName } = city;

  const locality =
    pickLocalityCandidate(entry.locality, cityName) ||
    pickLocalityCandidate(entry.region, cityName);
  if (locality) return combineLocalityAndCity(locality, cityName);

  const area = pickLocalityCandidate(entry.area, cityName);
  if (area) return combineLocalityAndCity(area, cityName);

  const landmark = pickLocalityCandidate(entry.landmark, cityName);
  if (landmark) return combineLocalityAndCity(landmark, cityName);

  if (entry.address?.trim()) {
    const parsed = extractLocalityFromAddress(entry.address, cityName, entry.stateName);
    if (parsed) return combineLocalityAndCity(parsed, cityName);
  }

  return cityName;
}

export function catalogEntryHasCardLocality(entry: LocationSourceEntry): boolean {
  const display = resolveHotelDisplayLocation(entry);
  const city = entry.cityName?.trim() || resolveCityName(entry)?.cityName || "";
  if (!display || !city) return false;
  return !isCityOnlyDisplayLocation(display, city);
}

export function catalogEntryNeedsLocationBackfill(entry: TripJackHotelCatalogEntry): boolean {
  if (entry.isDeleted || !entry.contentSynced) return false;
  if (!entry.displayLocation?.trim()) return true;
  if (isCityOnlyDisplayLocation(entry.displayLocation, entry.cityName)) return true;
  if (!catalogEntryHasCardLocality(entry) && Boolean(entry.address?.trim() || entry.region?.trim())) {
    return true;
  }
  return false;
}

export function enrichCatalogEntryLocation(
  entry: TripJackHotelCatalogEntry
): TripJackHotelCatalogEntry {
  const resolved = resolveCatalogLocation(entry);
  if (!resolved) return entry;

  const locality =
    pickLocalityCandidate(entry.locality, resolved.cityName) ||
    pickLocalityCandidate(entry.region, resolved.cityName) ||
    resolved.locality;
  const area = pickLocalityCandidate(entry.area, resolved.cityName);
  const landmark = pickLocalityCandidate(entry.landmark, resolved.cityName);
  const displayLocation = resolveHotelDisplayLocation({
    ...entry,
    cityName: resolved.cityName,
    locality,
    area,
    landmark,
    displayLocation: resolved.displayLocation,
  });

  const searchBlob = [
    entry.name,
    resolved.cityName,
    locality ?? "",
    area ?? "",
    landmark ?? "",
    entry.stateName ?? "",
    entry.countryName,
    entry.address,
    displayLocation,
    entry.propertyType ?? "",
    entry.description ?? "",
  ]
    .map((part) => part.toLowerCase().trim())
    .filter(Boolean)
    .join(" ");

  return {
    ...entry,
    cityName: resolved.cityName,
    cityNameLower: resolved.cityName.toLowerCase(),
    locality: locality || entry.locality,
    area: area || entry.area,
    landmark: landmark || entry.landmark,
    displayLocation,
    region: locality || entry.region,
    searchBlob,
  };
}

export function formatFeaturedCardLocation(entry: TripJackHotelCatalogEntry): ResolvedCatalogLocation | null {
  const enriched = enrichCatalogEntryLocation(entry);
  const resolved = resolveCatalogLocation(enriched);
  if (!resolved) return null;

  const displayLocation = resolveHotelDisplayLocation(enriched);
  return {
    ...resolved,
    displayLocation,
    locality: resolved.locality || pickLocalityCandidate(enriched.locality, resolved.cityName),
  };
}
