import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function asNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = asString(obj[key]);
    if (v) return v;
  }
  return "";
}

function pickImages(raw: Record<string, unknown>): string[] {
  const images = raw.images ?? raw.imageList ?? raw.hotelImages;
  if (!Array.isArray(images)) return [];
  return images
    .map((item) => {
      if (typeof item === "string") return item;
      const rec = asRecord(item);
      return rec ? pickString(rec, ["url", "imageUrl", "link", "path"]) : "";
    })
    .filter(Boolean);
}

function pickFacilities(raw: Record<string, unknown>): string[] {
  const facilities = raw.facilities ?? raw.amenities ?? raw.facilityList;
  if (!Array.isArray(facilities)) return [];
  return facilities
    .map((item) => {
      if (typeof item === "string") return item;
      const rec = asRecord(item);
      return rec ? pickString(rec, ["name", "label", "facilityName"]) : "";
    })
    .filter(Boolean);
}

function pickGeo(raw: Record<string, unknown>): TripJackHotelCatalogEntry["geolocation"] {
  const geo = asRecord(raw.geolocation) ?? asRecord(raw.geoLocation) ?? asRecord(raw.location);
  if (!geo) return undefined;
  const lat = asNumber(geo.lat ?? geo.latitude);
  const lng = asNumber(geo.lng ?? geo.longitude ?? geo.lon);
  if (lat === null && lng === null) return undefined;
  return { lat: lat ?? undefined, lng: lng ?? undefined };
}

export function buildSearchBlob(parts: string[]): string {
  return parts
    .map((p) => p.toLowerCase().trim())
    .filter(Boolean)
    .join(" ");
}

export function normalizeStaticHotelRecord(
  raw: unknown,
  options?: { isDeleted?: boolean }
): TripJackHotelCatalogEntry | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const tjHotelId =
    asNumber(rec.tjHotelId) ??
    asNumber(rec.hotelId) ??
    asNumber(rec.hid) ??
    asNumber(rec.id);
  if (!tjHotelId || tjHotelId <= 0) return null;

  const name = pickString(rec, ["name", "hotelName", "propertyName"]);
  if (!name) return null;

  const cityName = pickString(rec, ["cityName", "city", "destinationCity"]);
  const countryName = pickString(rec, ["countryName", "country"]);
  const countryCode = pickString(rec, ["countryCode", "countryIsoCode"]);
  const address = pickString(rec, ["address", "fullAddress", "locationAddress"]);
  const propertyType = pickString(rec, ["propertyType", "type", "category"]);
  const rating = asNumber(rec.rating ?? rec.starRating ?? rec.stars);
  const unicaIdRaw = rec.unicaId ?? rec.unicaID ?? rec.unica;
  const unicaId =
    typeof unicaIdRaw === "string" || typeof unicaIdRaw === "number" ? unicaIdRaw : undefined;

  const nameLower = name.toLowerCase();
  const cityNameLower = cityName.toLowerCase();
  const searchBlob = buildSearchBlob([name, cityName, countryName, address, propertyType]);

  const now = new Date().toISOString();

  return {
    id: `tj_${tjHotelId}`,
    tjHotelId,
    unicaId,
    name,
    nameLower,
    cityName,
    cityNameLower,
    countryName,
    countryCode: countryCode || undefined,
    address,
    rating,
    images: pickImages(rec),
    facilities: pickFacilities(rec),
    geolocation: pickGeo(rec),
    propertyType: propertyType || undefined,
    isDeleted: options?.isDeleted ?? Boolean(rec.isDeleted ?? rec.deleted),
    searchBlob,
    updatedAt: now,
  };
}

export function extractStaticHotelsPayload(raw: unknown): {
  hotels: unknown[];
  syncNext: string | null;
} {
  const root = asRecord(raw);
  if (!root) return { hotels: [], syncNext: null };

  const data = asRecord(root.data) ?? root;
  const hotels =
    (Array.isArray(data.hotels) && data.hotels) ||
    (Array.isArray(data.hotelList) && data.hotelList) ||
    (Array.isArray(data.staticHotels) && data.staticHotels) ||
    (Array.isArray(root.hotels) && root.hotels) ||
    [];

  const syncNext =
    asString(data.syncNext) ||
    asString(data.next) ||
    asString(data.nextToken) ||
    asString(root.syncNext) ||
    null;

  return { hotels, syncNext: syncNext || null };
}
