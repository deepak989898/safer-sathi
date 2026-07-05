function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(obj: Record<string, unknown> | null, keys: string[]): string {
  if (!obj) return "";
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickNumber(obj: Record<string, unknown> | null, keys: string[]): number {
  if (!obj) return 0;
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return 0;
}

function pickBool(obj: Record<string, unknown> | null, keys: string[], fallback = false): boolean {
  if (!obj) return fallback;
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "boolean") return v;
  }
  return fallback;
}

export interface NormalizedHotelBookingDetails {
  bookingId: string;
  supplierReference: string;
  confirmationNumber: string;
  voucherUrl: string;
  voucherNumber: string;
  bookingStatus: string;
  orderStatus: string;
  cancellationAllowed: boolean;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  totalFare: number;
  statusSuccess: boolean;
}

export function normalizeHotelBookingDetails(raw: unknown): NormalizedHotelBookingDetails | null {
  const root = asRecord(raw);
  if (!root) return null;

  const data = asRecord(root.data) ?? root;
  const order = asRecord(data.order) ?? asRecord(data.booking) ?? data;
  const hotel = asRecord(order.hotel) ?? asRecord(data.hotel) ?? {};
  const statusRec = asRecord(data.status) ?? asRecord(order.status) ?? {};

  const bookingId =
    pickString(order, ["bookingId", "id"]) || pickString(data, ["bookingId", "id"]);
  if (!bookingId) return null;

  const statusSuccess =
    statusRec.success === true || data.success === true || root.success === true;

  const bookingStatus =
    pickString(order, ["bookingStatus", "status", "orderStatus"]) ||
    pickString(data, ["bookingStatus", "status"]);

  return {
    bookingId,
    supplierReference:
      pickString(order, ["supplierReference", "supplierRef", "supplierBookingId"]) ||
      pickString(data, ["supplierReference", "supplierRef"]),
    confirmationNumber:
      pickString(order, ["confirmationNumber", "voucherNumber", "hotelConfirmationNumber"]) ||
      pickString(data, ["confirmationNumber", "voucherNumber"]),
    voucherUrl:
      pickString(order, ["voucherUrl", "voucherLink", "ticketUrl"]) ||
      pickString(data, ["voucherUrl", "voucherLink"]),
    voucherNumber:
      pickString(order, ["voucherNumber", "confirmationNumber"]) ||
      pickString(data, ["voucherNumber"]),
    bookingStatus,
    orderStatus: pickString(order, ["orderStatus", "status"]) || bookingStatus,
    cancellationAllowed: pickBool(order, ["cancellationAllowed", "isCancellable"], true) &&
      pickBool(data, ["cancellationAllowed", "isCancellable"], true),
    hotelName: pickString(hotel, ["name", "hotelName"]) || pickString(order, ["hotelName"]),
    checkIn: pickString(order, ["checkIn", "checkin"]) || pickString(hotel, ["checkIn"]),
    checkOut: pickString(order, ["checkOut", "checkout"]) || pickString(hotel, ["checkOut"]),
    totalFare: pickNumber(order, ["totalAmount", "totalFare", "amount"]) ||
      pickNumber(data, ["totalAmount", "totalFare"]),
    statusSuccess,
  };
}

export interface NormalizedHotelCancelResult {
  success: boolean;
  bookingId: string;
  cancellationStatus: string;
  cancellationCharge: number;
  refundAmount: number;
  message: string;
}

export function normalizeHotelCancelResponse(raw: unknown): NormalizedHotelCancelResult | null {
  const root = asRecord(raw);
  if (!root) return null;

  const data = asRecord(root.data) ?? root;
  const statusRec = asRecord(data.status) ?? asRecord(root.status) ?? {};

  const bookingId = pickString(data, ["bookingId", "id"]) || pickString(root, ["bookingId"]);
  const success =
    statusRec.success === true || data.success === true || root.success === true;

  return {
    success,
    bookingId,
    cancellationStatus:
      pickString(data, ["cancellationStatus", "status", "orderStatus"]) ||
      (success ? "CANCELLED" : "FAILED"),
    cancellationCharge: pickNumber(data, ["cancellationCharge", "penaltyAmount", "charges"]),
    refundAmount: pickNumber(data, ["refundAmount", "refundableAmount"]),
    message: pickString(data, ["message"]) || pickString(statusRec, ["message"]),
  };
}
