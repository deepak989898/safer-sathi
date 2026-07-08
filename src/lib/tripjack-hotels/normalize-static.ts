import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";
import { enrichCatalogEntryLocation } from "@/lib/tripjack-hotels/catalog-location";
import { catalogEntryHasDisplayImage, parseTripJackHotelImages } from "@/lib/tripjack-hotels/hotel-images";

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

function pickImages(raw: Record<string, unknown>) {
  return parseTripJackHotelImages(
    raw.images,
    raw.imageList,
    raw.hotelImages,
    raw.imageUrls,
    raw.propertyImages,
    raw.gallery,
    raw.media,
    asRecord(raw.staticContent)?.images,
    asRecord(raw.hotelInfo)?.images,
    asRecord(raw.content)?.images
  );
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

function pickPolicies(raw: Record<string, unknown>): string[] {
  const policies = raw.policies ?? raw.policyList ?? raw.hotelPolicies;
  if (!Array.isArray(policies)) return [];
  return policies
    .map((item) => {
      if (typeof item === "string") return item;
      const rec = asRecord(item);
      return rec ? pickString(rec, ["name", "label", "policy", "description", "title"]) : "";
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

  const addressObj =
    asRecord(rec.address) ??
    asRecord(rec.hotelAddress) ??
    asRecord(rec.location) ??
    asRecord(asRecord(rec.hotelInfo)?.address) ??
    asRecord(asRecord(rec.staticContent)?.address);

  const cityName =
    pickString(rec, ["cityName", "city", "destinationCity", "town"]) ||
    pickString(addressObj ?? {}, ["cityName", "city", "town", "destinationCity"]);
  const cityCode =
    pickString(rec, ["cityCode", "cityId", "destinationCityCode"]) ||
    pickString(addressObj ?? {}, ["cityCode", "cityId", "destinationCityCode"]);
  const stateName =
    pickString(rec, ["stateName", "state", "province"]) ||
    pickString(addressObj ?? {}, ["stateName", "state", "province"]);
  const locality =
    pickString(rec, [
      "locality",
      "subLocality",
      "neighbourhood",
      "neighborhood",
      "micromarket",
      "microMarket",
      "location",
    ]) ||
    pickString(addressObj ?? {}, [
      "locality",
      "subLocality",
      "neighbourhood",
      "neighborhood",
      "micromarket",
      "microMarket",
    ]);
  const area =
    pickString(rec, ["area", "zone", "regionName", "district", "microlocation"]) ||
    pickString(addressObj ?? {}, ["area", "zone", "regionName", "district"]);
  const landmark =
    pickString(rec, ["landmark", "landmarkName", "nearLandmark", "landmarkString"]) ||
    pickString(addressObj ?? {}, ["landmark", "landmarkName", "nearLandmark"]);
  const region =
    locality ||
    area ||
    pickString(rec, ["region", "regionName"]) ||
    pickString(addressObj ?? {}, ["region", "regionName"]);
  const countryName =
    pickString(rec, ["countryName", "country"]) ||
    pickString(addressObj ?? {}, ["countryName", "country"]);
  const countryCode =
    pickString(rec, ["countryCode", "countryIsoCode"]) ||
    pickString(addressObj ?? {}, ["countryCode", "countryIsoCode"]);
  const address =
    pickString(rec, ["address", "fullAddress", "locationAddress", "completeAddress", "hotelAddress"]) ||
    [
      pickString(addressObj ?? {}, [
        "line1",
        "line2",
        "addressLine1",
        "addressLine2",
        "addressLine",
        "street",
      ]),
      pickString(addressObj ?? {}, ["area", "locality", "city", "state", "postalCode", "zip"]),
    ]
      .filter(Boolean)
      .join(", ");
  const propertyType = pickString(rec, ["propertyType", "type", "category"]);
  const rating = asNumber(rec.rating ?? rec.starRating ?? rec.stars);
  const starRating = asNumber(rec.starRating ?? rec.stars ?? rec.rating);
  const description = pickString(rec, [
    "description",
    "hotelDescription",
    "longDescription",
    "about",
    "overview",
  ]);
  const contact = pickString(rec, [
    "contact",
    "phone",
    "contactNumber",
    "mobile",
    "telephone",
  ]);
  const unicaIdRaw = rec.unicaId ?? rec.unicaID ?? rec.unica;
  const unicaId =
    typeof unicaIdRaw === "string" || typeof unicaIdRaw === "number" ? unicaIdRaw : undefined;

  const nameLower = name.toLowerCase();
  const cityNameLower = cityName.toLowerCase();
  const isDeleted = options?.isDeleted ?? Boolean(rec.isDeleted ?? rec.deleted);
  const policies = pickPolicies(rec);
  const searchBlob = buildSearchBlob([
    name,
    cityName,
    cityCode,
    stateName,
    locality,
    area,
    landmark,
    region,
    countryName,
    address,
    propertyType,
    description,
  ]);

  const imageData = pickImages(rec);
  const now = new Date().toISOString();

  const baseEntry: TripJackHotelCatalogEntry = {
    id: `tj_${tjHotelId}`,
    tjHotelId,
    unicaId,
    name,
    nameLower,
    cityName,
    cityNameLower,
    cityCode: cityCode || undefined,
    stateName: stateName || undefined,
    locality: locality || undefined,
    area: area || undefined,
    landmark: landmark || undefined,
    region: region || undefined,
    countryName: countryName || "INDIA",
    countryCode: countryCode || undefined,
    address,
    rating,
    starRating,
    images: imageData.rawImages.length ? imageData.rawImages : undefined,
    imageUrls: imageData.imageUrls,
    heroImage: imageData.heroImage,
    imageCaption: imageData.imageCaption,
    facilities: pickFacilities(rec),
    policies: policies.length ? policies : undefined,
    geolocation: pickGeo(rec),
    propertyType: propertyType || undefined,
    description: description || undefined,
    contact: contact || undefined,
    contentSynced: true,
    hasDisplayImage: imageData.imageUrls.length > 0,
    websiteVisible: true,
    isActive: !isDeleted,
    isDeleted,
    searchBlob,
    updatedAt: now,
  };

  const enriched = enrichCatalogEntryLocation(baseEntry);
  return {
    ...enriched,
    hasDisplayImage: catalogEntryHasDisplayImage(enriched),
  };
}

export interface TripJackHotelMappingRecord {
  tjHotelId: number;
  unicaId?: string | number;
}

export function normalizeHotelMappingRecord(raw: unknown): TripJackHotelMappingRecord | null {
  const rec = asRecord(raw);
  if (!rec) return null;

  const tjHotelId =
    asNumber(rec.tjHotelId) ??
    asNumber(rec.hotelId) ??
    asNumber(rec.hid) ??
    asNumber(rec.id);
  if (!tjHotelId || tjHotelId <= 0) return null;

  const unicaIdRaw = rec.unicaId ?? rec.unicaID ?? rec.unica;
  const unicaId =
    typeof unicaIdRaw === "string" || typeof unicaIdRaw === "number" ? unicaIdRaw : undefined;

  return { tjHotelId, unicaId };
}

export function mappingRecordToCatalogEntry(
  mapping: TripJackHotelMappingRecord,
  countryName = "INDIA"
): TripJackHotelCatalogEntry {
  const now = new Date().toISOString();
  const label = `Hotel ${mapping.tjHotelId}`;
  return {
    id: `tj_${mapping.tjHotelId}`,
    tjHotelId: mapping.tjHotelId,
    unicaId: mapping.unicaId,
    name: label,
    nameLower: label.toLowerCase(),
    cityName: "",
    cityNameLower: "",
    countryName,
    address: "",
    rating: null,
    images: [],
    imageUrls: [],
    facilities: [],
    contentSynced: false,
    websiteVisible: true,
    isActive: true,
    isDeleted: false,
    searchBlob: buildSearchBlob([label, String(mapping.unicaId ?? "")]),
    updatedAt: now,
  };
}

function extractArrayFromPayload(raw: unknown, keys: string[]): unknown[] {
  const root = asRecord(raw);
  if (!root) return [];

  const data = asRecord(root.data) ?? root;
  for (const key of keys) {
    const value = data[key] ?? root[key];
    if (Array.isArray(value) && value.length) return value;
  }

  if (Array.isArray(root)) return root;
  return [];
}

export function extractHotelMappingPayload(
  raw: unknown,
  pageSize = 2000
): {
  mappings: TripJackHotelMappingRecord[];
  page: number;
  totalPages: number | null;
  hasMore: boolean;
} {
  const root = asRecord(raw);
  if (!root) {
    return { mappings: [], page: 0, totalPages: null, hasMore: false };
  }

  const data = asRecord(root.data) ?? root;
  const items = extractArrayFromPayload(raw, [
    "hotelMappings",
    "hotelMapping",
    "mappings",
    "mappingList",
    "content",
    "hotels",
    "hotelList",
  ]);

  const mappings = items
    .map((item) => normalizeHotelMappingRecord(item))
    .filter((item): item is TripJackHotelMappingRecord => Boolean(item));

  const page =
    asNumber(data.page) ??
    asNumber(data.pageNumber) ??
    asNumber(root.page) ??
    0;
  const totalPages =
    asNumber(data.totalPages) ??
    asNumber(data.totalPage) ??
    asNumber(root.totalPages) ??
    null;
  const totalElements =
    asNumber(data.totalElements) ??
    asNumber(data.totalCount) ??
    asNumber(root.totalElements) ??
    null;

  const hasMore =
    totalPages !== null
      ? page + 1 < totalPages
      : totalElements !== null
        ? (page + 1) * pageSize < totalElements
        : mappings.length >= pageSize;

  return { mappings, page, totalPages, hasMore };
}

export function extractHotelContentPayload(raw: unknown): unknown[] {
  return extractArrayFromPayload(raw, [
    "hotels",
    "hotelList",
    "hotelContent",
    "content",
    "staticHotels",
    "data",
  ]);
}

/** @deprecated Legacy fetch-static-hotels pagination — do not use. */
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
    asString(root.next) ||
    null;

  return { hotels, syncNext: syncNext || null };
}
