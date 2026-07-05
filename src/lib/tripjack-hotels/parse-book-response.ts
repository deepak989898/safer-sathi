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

export interface NormalizedHotelBookResult {
  bookingId: string;
  supplierReference: string;
  confirmationNumber: string;
  voucherUrl: string;
  orderStatus: string;
  statusSuccess: boolean;
}

export function normalizeHotelBookResponse(raw: unknown): NormalizedHotelBookResult | null {
  const root = asRecord(raw);
  if (!root) return null;

  const data = asRecord(root.data) ?? root;
  const order = asRecord(data.order) ?? asRecord(data.booking) ?? data;
  const statusRec = asRecord(data.status) ?? asRecord(order.status) ?? {};

  const bookingId =
    pickString(order, ["bookingId", "id"]) || pickString(data, ["bookingId", "id"]);
  if (!bookingId) return null;

  const statusSuccess =
    statusRec.success === true ||
    data.success === true ||
    root.success === true;

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
    orderStatus: pickString(order, ["status", "orderStatus"]) || pickString(data, ["status"]),
    statusSuccess,
  };
}
