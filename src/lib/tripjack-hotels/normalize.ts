import type {
  NormalizedHotel,
  NormalizedHotelOption,
  NormalizedHotelPricing,
} from "@/lib/tripjack-hotels/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pickString(record: Record<string, unknown> | null, keys: string[], fallback = ""): string {
  if (!record) return fallback;
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return fallback;
}

function pickNumber(record: Record<string, unknown> | null, keys: string[], fallback = 0): number {
  if (!record) return fallback;
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null || value === "") continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function pickBool(record: Record<string, unknown> | null, keys: string[], fallback = false): boolean {
  if (!record) return fallback;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (value === "true" || value === 1 || value === "1") return true;
    if (value === "false" || value === 0 || value === "0") return false;
  }
  return fallback;
}

function unwrapPayload(raw: unknown): Record<string, unknown> | null {
  const record = asRecord(raw);
  if (!record) return null;
  if (record.success === true && record.data) return asRecord(record.data);
  return record;
}

function stringList(value: unknown): string[] {
  return asArray(value)
    .map((item) => {
      if (typeof item === "string") return item;
      const rec = asRecord(item);
      if (!rec) return "";
      return pickString(rec, ["name", "description", "text", "value", "roomName", "type"], "");
    })
    .filter(Boolean);
}

function parsePricing(pricingRaw: unknown, currencyFallback: string): NormalizedHotelPricing {
  const pricing = asRecord(pricingRaw);
  const basePrice = pickNumber(pricing, ["basePrice", "base", "BF"], 0);
  const taxes = pickNumber(pricing, ["taxes", "tax", "TAF"], 0);
  const mf = pickNumber(pricing, ["mf", "managementFee"], 0);
  const mft = pickNumber(pricing, ["mft", "managementFeeTax"], 0);
  const discount = pickNumber(pricing, ["discount"], 0);
  const currency = pickString(pricing, ["currency"], currencyFallback) || "INR";
  const totalFromApi = pickNumber(pricing, ["totalPrice", "total", "TF"], 0);
  const computed = basePrice + taxes + mf + mft;
  return {
    totalPrice: totalFromApi > 0 ? totalFromApi : computed,
    basePrice,
    discount,
    taxes,
    mf,
    mft,
    currency,
  };
}

function parseOption(optionRaw: unknown, currencyFallback: string): NormalizedHotelOption | null {
  const option = asRecord(optionRaw);
  if (!option) return null;

  const optionId = pickString(option, ["optionId", "id"], "");
  if (!optionId) return null;

  const pricing = parsePricing(option.pricing, currencyFallback);
  const commercial = asRecord(option.commercial);
  const compliance = asRecord(option.compliance);
  const cancellation = asRecord(option.cancellation);

  return {
    optionId,
    optionType: pickString(option, ["optionType", "type"], ""),
    roomInfo: stringList(option.roomInfo ?? option.rooms),
    inclusions: stringList(option.inclusions),
    mealBasis: pickString(option, ["mealBasis", "mealPlan", "boardBasis"], "—"),
    pricing,
    commercialType: pickString(commercial, ["type"], ""),
    commission: pickNumber(commercial, ["commission"], 0),
    gstType: pickString(compliance, ["gstType"], ""),
    panRequired: pickBool(compliance, ["panRequired"], false),
    passportRequired: pickBool(compliance, ["passportRequired"], false),
    isRefundable: pickBool(cancellation, ["isRefundable", "refundable"], false),
    penalties: asArray(cancellation?.penalties),
    rawOption: null,
  };
}

function parseHotel(hotelRaw: unknown, currencyFallback: string): NormalizedHotel | null {
  const hotel = asRecord(hotelRaw);
  if (!hotel) return null;

  const tjHotelId = hotel.tjHotelId ?? hotel.hotelId ?? hotel.id ?? hotel.hid;
  if (tjHotelId === undefined || tjHotelId === null || tjHotelId === "") return null;

  const name = pickString(hotel, ["name", "hotelName"], "Hotel");
  const options = asArray(hotel.options)
    .map((opt) => parseOption(opt, currencyFallback))
    .filter((opt): opt is NormalizedHotelOption => Boolean(opt));

  options.sort((a, b) => a.pricing.totalPrice - b.pricing.totalPrice);
  const cheapest = options[0] ?? null;

  return {
    tjHotelId: typeof tjHotelId === "number" ? tjHotelId : String(tjHotelId),
    name,
    cheapestTotalPrice: cheapest?.pricing.totalPrice ?? 0,
    cheapestBasePrice: cheapest?.pricing.basePrice ?? 0,
    cheapestTaxes: cheapest?.pricing.taxes ?? 0,
    cheapestMf: cheapest?.pricing.mf ?? 0,
    cheapestMft: cheapest?.pricing.mft ?? 0,
    currency: cheapest?.pricing.currency ?? currencyFallback,
    mealBasis: cheapest?.mealBasis ?? "—",
    inclusions: cheapest?.inclusions ?? [],
    isRefundable: cheapest?.isRefundable ?? false,
    panRequired: cheapest?.panRequired ?? false,
    passportRequired: cheapest?.passportRequired ?? false,
    options,
    cheapestOption: cheapest,
  };
}

export function normalizeTripJackHotelListing(raw: unknown): {
  correlationId: string;
  nationality: string;
  currency: string;
  totalResults: number;
  hotels: NormalizedHotel[];
} {
  const payload = unwrapPayload(raw) ?? asRecord(raw);
  if (!payload) {
    return {
      correlationId: "",
      nationality: "",
      currency: "INR",
      totalResults: 0,
      hotels: [],
    };
  }

  const currency = pickString(payload, ["currency"], "INR") || "INR";
  const hotelsRaw =
    asArray(payload.hotels) ||
    asArray(asRecord(payload.data)?.hotels) ||
    asArray(payload.hotelList);

  const hotels = hotelsRaw
    .map((h) => parseHotel(h, currency))
    .filter((h): h is NormalizedHotel => Boolean(h))
    .sort((a, b) => a.cheapestTotalPrice - b.cheapestTotalPrice);

  const totalResults = pickNumber(payload, ["totalResults", "count"], hotels.length);

  return {
    correlationId: pickString(payload, ["correlationId"], ""),
    nationality: pickString(payload, ["nationality"], ""),
    currency,
    totalResults: totalResults || hotels.length,
    hotels,
  };
}
