import type { TripJackHotelCatalogEntry } from "@/lib/tripjack-hotels/catalog-types";
import type { NormalizedHotelDetail } from "@/lib/tripjack-hotels/types";

export interface HotelAmenityGroup {
  label: string;
  items: string[];
}

export interface HotelCatalogEnrichment {
  name?: string;
  address?: string;
  cityName?: string;
  stateName?: string;
  countryName?: string;
  rating?: number | null;
  starRating?: number | null;
  imageUrls?: string[];
  heroImage?: string;
  images?: unknown[];
  facilities?: string[];
  rawFacilities?: unknown;
  description?: string;
  policies?: string[];
  propertyType?: string;
  contact?: string;
  geolocation?: { lat?: number; lng?: number };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function decodeRecordText(value: unknown): string {
  if (typeof value === "string") return decodeHotelText(value);
  if (Array.isArray(value)) {
    return value.map(decodeRecordText).filter(Boolean).join(" ");
  }
  const rec = asRecord(value);
  if (!rec) return "";
  return pickString(rec, ["text", "description", "value", "content", "html"]);
}

/** Safely decode JSON/stringified/HTML hotel descriptions for customer display. */
export function decodeHotelText(input: string | undefined | null): string {
  if (!input?.trim()) return "";
  const trimmed = input.trim();

  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (typeof parsed === "string") return decodeHotelText(parsed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => decodeRecordText(item))
          .filter(Boolean)
          .join("\n\n");
      }
      const rec = asRecord(parsed);
      if (rec) {
        const direct = pickString(rec, [
          "description",
          "general",
          "overview",
          "about",
          "text",
          "html",
        ]);
        if (direct) return stripHtml(direct);

        return Object.entries(rec)
          .map(([key, value]) => {
            const text = decodeRecordText(value);
            if (!text) return "";
            const label = key
              .replace(/([A-Z])/g, " $1")
              .replace(/[_-]+/g, " ")
              .trim()
              .replace(/^\w/, (c) => c.toUpperCase());
            return `${label}: ${text}`;
          })
          .filter(Boolean)
          .join("\n\n");
      }
    } catch {
      // fall through to plain text handling
    }
  }

  return stripHtml(trimmed);
}

function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function parseFacilityGroups(
  facilities: string[],
  rawFacilities?: unknown
): HotelAmenityGroup[] {
  const groups = new Map<string, Set<string>>();

  const add = (label: string, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    const key = label.trim() || "General";
    const set = groups.get(key) ?? new Set<string>();
    set.add(clean);
    groups.set(key, set);
  };

  if (Array.isArray(rawFacilities)) {
    for (const item of rawFacilities) {
      if (typeof item === "string") {
        add("General", item);
        continue;
      }
      const rec = asRecord(item);
      if (!rec) continue;
      const name = pickString(rec, ["name", "label", "facilityName", "title"]);
      const type = pickString(rec, ["type", "category", "group", "facilityType", "section"]);
      add(type || "General", name);
    }
  }

  for (const name of facilities) {
    add("Hotel", name);
  }

  if (!groups.size) return [];

  const order = ["Hotel", "Room", "General", "Services", "Nearby", "Recreation", "Business"];
  return Array.from(groups.entries())
    .map(([label, items]) => ({
      label: label.replace(/_/g, " "),
      items: Array.from(items).sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      const ai = order.findIndex((key) => a.label.toLowerCase().includes(key.toLowerCase()));
      const bi = order.findIndex((key) => b.label.toLowerCase().includes(key.toLowerCase()));
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
}

export function extractPolicyDetails(policies: string[] = []): {
  checkInPolicy?: string;
  checkOutPolicy?: string;
  generalPolicies: string[];
} {
  const generalPolicies: string[] = [];
  let checkInPolicy: string | undefined;
  let checkOutPolicy: string | undefined;

  for (const policy of policies) {
    const clean = policy.trim();
    if (!clean) continue;
    const lower = clean.toLowerCase();
    if (!checkInPolicy && (lower.includes("check-in") || lower.includes("check in"))) {
      checkInPolicy = clean;
      continue;
    }
    if (!checkOutPolicy && (lower.includes("check-out") || lower.includes("check out"))) {
      checkOutPolicy = clean;
      continue;
    }
    generalPolicies.push(clean);
  }

  return { checkInPolicy, checkOutPolicy, generalPolicies };
}

export function catalogEntryToEnrichment(
  entry: TripJackHotelCatalogEntry,
  rawFacilities?: unknown
): HotelCatalogEnrichment {
  return {
    name: entry.name,
    address: entry.address,
    cityName: entry.cityName,
    stateName: entry.stateName,
    countryName: entry.countryName,
    rating: entry.rating,
    starRating: entry.starRating ?? entry.rating,
    imageUrls: entry.imageUrls,
    heroImage: entry.heroImage,
    images: entry.images,
    facilities: entry.facilities,
    rawFacilities,
    description: entry.description,
    policies: entry.policies,
    propertyType: entry.propertyType,
    contact: entry.contact,
    geolocation: entry.geolocation,
  };
}

export function applyCatalogEnrichmentToDetail(
  detail: NormalizedHotelDetail,
  enrichment?: HotelCatalogEnrichment
): NormalizedHotelDetail {
  if (!enrichment) return detail;

  const next: NormalizedHotelDetail = { ...detail };

  if (enrichment.address || enrichment.cityName) {
    next.address =
      next.address ||
      enrichment.address ||
      [enrichment.cityName, enrichment.stateName, enrichment.countryName].filter(Boolean).join(", ");
    next.location =
      next.location ||
      [enrichment.address, enrichment.cityName, enrichment.stateName, enrichment.countryName]
        .filter(Boolean)
        .join(", ");
  }

  next.cityName = next.cityName || enrichment.cityName;
  next.stateName = next.stateName || enrichment.stateName;
  next.countryName = next.countryName || enrichment.countryName;
  next.propertyType = next.propertyType || enrichment.propertyType;
  next.contact = next.contact || enrichment.contact;
  next.geolocation = next.geolocation || enrichment.geolocation;

  const decodedDescription =
    decodeHotelText(next.description) || decodeHotelText(enrichment.description);
  if (decodedDescription) next.description = decodedDescription;

  const facilities = [
    ...next.amenities,
    ...(enrichment.facilities ?? []),
  ].filter(Boolean);
  const uniqueFacilities = [...new Set(facilities)];
  if (uniqueFacilities.length) next.amenities = uniqueFacilities;

  const groups = parseFacilityGroups(uniqueFacilities, enrichment.rawFacilities);
  if (groups.length) next.amenityGroups = groups;

  const policies = [...(next.policies ?? []), ...(enrichment.policies ?? [])].filter(Boolean);
  const uniquePolicies = [...new Set(policies)];
  if (uniquePolicies.length) {
    next.policies = uniquePolicies;
    const policyDetails = extractPolicyDetails(uniquePolicies);
    next.checkInPolicy = next.checkInPolicy || policyDetails.checkInPolicy;
    next.checkOutPolicy = next.checkOutPolicy || policyDetails.checkOutPolicy;
  }

  if (enrichment.starRating != null && next.starRating == null) {
    next.starRating = enrichment.starRating;
  } else if (enrichment.rating != null && next.starRating == null) {
    next.starRating = enrichment.rating;
  }

  if (enrichment.name && next.name === "Hotel") {
    next.name = enrichment.name;
  }

  return next;
}

export function staticContentToEnrichment(
  entry: TripJackHotelCatalogEntry | null,
  rawHotel?: unknown
): HotelCatalogEnrichment | undefined {
  if (!entry && !rawHotel) return undefined;
  const rec = asRecord(rawHotel);
  const rawFacilities = rec?.facilities ?? rec?.amenities ?? rec?.facilityList;
  if (entry) return catalogEntryToEnrichment(entry, rawFacilities);
  if (!rec) return undefined;

  return {
    name: pickString(rec, ["name", "hotelName"]),
    address: pickString(rec, ["address", "fullAddress"]),
    cityName: pickString(rec, ["cityName", "city"]),
    stateName: pickString(rec, ["stateName", "state"]),
    countryName: pickString(rec, ["countryName", "country"]),
    description: pickString(rec, ["description", "overview", "about", "hotelDescription"]),
    propertyType: pickString(rec, ["propertyType", "type", "category"]),
    contact: pickString(rec, ["contact", "phone", "telephone"]),
    rawFacilities,
    facilities: Array.isArray(rawFacilities)
      ? rawFacilities
          .map((item) =>
            typeof item === "string"
              ? item
              : pickString(asRecord(item) ?? {}, ["name", "label", "facilityName"])
          )
          .filter(Boolean)
      : [],
    policies: Array.isArray(rec.policies)
      ? rec.policies
          .map((item) =>
            typeof item === "string"
              ? item
              : pickString(asRecord(item) ?? {}, ["description", "policy", "name", "title"])
          )
          .filter(Boolean)
      : undefined,
  };
}
