import type {
  CancellationPenalty,
  NormalizedHotel,
  NormalizedHotelDetail,
  NormalizedHotelOption,
  NormalizedHotelPricing,
} from "@/lib/tripjack-hotels/types";
import { HOTEL_SESSION_TTL_MS } from "@/lib/tripjack-hotels/config";

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

function mealBasisLabel(code: string): string {
  const key = code.trim().toUpperCase().replace(/[_\s-]+/g, " ");
  const map: Record<string, string> = {
    RO: "Room Only",
    "ROOM ONLY": "Room Only",
    EP: "Room Only",
    BB: "Breakfast",
    BREAKFAST: "Breakfast",
    CP: "Breakfast",
    HB: "Half Board",
    "HALF BOARD": "Half Board",
    MAP: "Half Board",
    FB: "Full Board",
    "FULL BOARD": "Full Board",
    AP: "Full Board",
    AI: "All Inclusive",
    "ALL INCLUSIVE": "All Inclusive",
  };
  return map[key] || code || "—";
}

function parsePenalties(
  penaltiesRaw: unknown,
  currency: string
): { penalties: CancellationPenalty[]; freeCancellationUntil: string } {
  const penalties: CancellationPenalty[] = [];
  let freeCancellationUntil = "";

  for (const item of asArray(penaltiesRaw)) {
    const rec = asRecord(item);
    if (!rec) continue;
    const amount = pickNumber(rec, ["amount", "penalty", "charge", "cancellationCharge"], 0);
    const from = pickString(rec, ["from", "startDate", "start", "fromDate"], "");
    const to = pickString(rec, ["to", "endDate", "end", "toDate"], "");
    const cur = pickString(rec, ["currency"], currency) || currency;

    if (amount === 0 && (from || to)) {
      freeCancellationUntil = freeCancellationUntil || to || from;
    }

    penalties.push({
      from: from || undefined,
      to: to || undefined,
      amount,
      currency: cur,
      label:
        amount === 0
          ? `Free cancellation${to || from ? ` until ${to || from}` : ""}`
          : `Cancellation charge ${cur} ${amount}${from || to ? ` from ${from || to}` : ""}`,
    });
  }

  return { penalties, freeCancellationUntil };
}

function parseOption(optionRaw: unknown, currencyFallback: string): NormalizedHotelOption | null {
  const option = asRecord(optionRaw);
  if (!option) return null;

  const optionId = pickString(option, ["optionId", "id"], "");
  if (!optionId) return null;

  const pricing = parsePricing(option.pricing, currencyFallback);
  const commercialRec = asRecord(option.commercial) ?? {};
  const compliance = asRecord(option.compliance);
  const cancellation = asRecord(option.cancellation);
  const mealBasis = pickString(option, ["mealBasis", "mealPlan", "boardBasis"], "—");
  const { penalties, freeCancellationUntil } = parsePenalties(
    cancellation?.penalties ?? option.penalties,
    pricing.currency
  );

  const roomInfo = stringList(option.roomInfo ?? option.rooms);
  const roomName =
    pickString(option, ["roomName", "name", "roomTypeName"], "") ||
    roomInfo[0] ||
    pickString(option, ["optionType", "type"], "Room");

  return {
    optionId,
    optionType: pickString(option, ["optionType", "type"], ""),
    roomName,
    roomType: pickString(option, ["roomType", "type", "optionType"], roomName),
    ratePlan: pickString(option, ["ratePlan", "ratePlanName", "planName"], mealBasis),
    roomInfo,
    roomImages: stringList(option.roomImages ?? option.images ?? option.photos),
    roomCapacity: pickString(option, ["roomCapacity", "capacity", "occupancy"], ""),
    roomFeatures: stringList(option.roomFeatures ?? option.features ?? option.amenities),
    inclusions: stringList(option.inclusions),
    mealBasis,
    mealBasisLabel: mealBasisLabel(mealBasis),
    bookingNotes: stringList(option.bookingNotes ?? option.notes),
    pricing,
    commercialType: pickString(commercialRec, ["type"], ""),
    commission: pickNumber(commercialRec, ["commission"], 0),
    commercial: commercialRec,
    gstType: pickString(compliance, ["gstType"], ""),
    panRequired: pickBool(compliance, ["panRequired"], false),
    passportRequired: pickBool(compliance, ["passportRequired"], false),
    isRefundable: pickBool(cancellation, ["isRefundable", "refundable"], false),
    freeCancellationUntil:
      freeCancellationUntil ||
      pickString(cancellation, ["freeCancellationUntil", "freeCancelUntil", "deadline"], ""),
    penalties,
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

function guestSummary(rooms: Array<{ adults?: number; children?: number }>): string {
  let adults = 0;
  let children = 0;
  for (const room of rooms) {
    adults += Number(room.adults) || 0;
    children += Number(room.children) || 0;
  }
  const roomLabel = `${rooms.length} room${rooms.length === 1 ? "" : "s"}`;
  const adultLabel = `${adults} adult${adults === 1 ? "" : "s"}`;
  const childLabel = children > 0 ? `, ${children} child${children === 1 ? "" : "ren"}` : "";
  return `${roomLabel} · ${adultLabel}${childLabel}`;
}

/** Normalize TripJack Hotel Detail / Pricing response. */
export function normalizeTripJackHotelDetail(
  raw: unknown,
  context: {
    correlationId: string;
    hotelId: string | number;
    checkIn: string;
    checkOut: string;
    rooms: Array<{ adults?: number; children?: number }>;
    currency: string;
    nationality: string;
    listingHotelName?: string;
  }
): NormalizedHotelDetail | null {
  const payload = unwrapPayload(raw) ?? asRecord(raw);
  if (!payload) return null;

  const hotel =
    asRecord(payload.hotel) ??
    asRecord(payload.hotelDetail) ??
    asRecord(payload.hotelInfo) ??
    payload;

  const currency =
    pickString(payload, ["currency"], "") ||
    pickString(hotel, ["currency"], context.currency) ||
    "INR";

  const optionsSource =
    asArray(payload.options).length > 0
      ? asArray(payload.options)
      : asArray(hotel.options);

  const options = optionsSource
    .map((opt) => parseOption(opt, currency))
    .filter((opt): opt is NormalizedHotelOption => Boolean(opt))
    .sort((a, b) => a.pricing.totalPrice - b.pricing.totalPrice);

  const hotelId =
    hotel.tjHotelId ??
    hotel.hotelId ??
    hotel.id ??
    hotel.hid ??
    payload.hotelId ??
    context.hotelId;

  const reviewHash = pickString(payload, ["reviewHash", "hash"], "") ||
    pickString(hotel, ["reviewHash", "hash"], "");

  const now = Date.now();
  const bookingNotes = [
    ...stringList(payload.bookingNotes ?? payload.notes),
    ...stringList(hotel.bookingNotes ?? hotel.notes),
  ];

  return {
    correlationId: pickString(payload, ["correlationId"], context.correlationId),
    hotelId: typeof hotelId === "number" ? hotelId : String(hotelId),
    name:
      pickString(hotel, ["name", "hotelName"], "") ||
      context.listingHotelName ||
      "Hotel",
    reviewHash,
    location: pickString(
      hotel,
      ["location", "address", "city", "locality", "area"],
      pickString(asRecord(hotel.address), ["city", "line1", "full"], "")
    ),
    starRating: (() => {
      const n = pickNumber(hotel, ["starRating", "stars", "rating"], 0);
      return n > 0 ? n : null;
    })(),
    amenities: stringList(hotel.amenities ?? hotel.facilities ?? payload.amenities),
    description: pickString(hotel, ["description", "desc", "about"], ""),
    images: stringList(hotel.images ?? hotel.photos ?? hotel.imageUrls ?? payload.images),
    checkIn: context.checkIn,
    checkOut: context.checkOut,
    guestSummary: guestSummary(context.rooms),
    bookingNotes,
    options,
    currency,
    nationality: pickString(payload, ["nationality"], context.nationality),
    fetchedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + HOTEL_SESSION_TTL_MS).toISOString(),
  };
}
