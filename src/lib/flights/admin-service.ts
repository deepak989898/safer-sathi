import type { AuthenticatedUser } from "@/lib/auth/server-auth";
import {
  canManageFlightBookingsAdmin,
  canViewFlightBookingFullDetails,
} from "@/lib/flights/admin-permissions";
import {
  getFlightBookingById,
  listAllFlightBookingsForAdmin,
  updateFlightBooking,
} from "@/lib/flights/firestore";
import {
  pollFlightAmendment,
  refreshFlightBookingDetails,
  releaseFlightPnr,
} from "@/lib/flights/post-booking-service";
import { retryTripJackFlightBook } from "@/lib/flights/booking-service";
import { getAdminNotesHistory } from "@/lib/flights/admin-notes";
import type {
  FlightAdminNote,
  FlightBookingRecord,
  FlightBookingStatus,
  FlightPaymentStatus,
} from "@/lib/flights/types";

export { getAdminNotesHistory };

export interface FlightAdminStats {
  total: number;
  confirmed: number;
  pending: number;
  manualReview: number;
  cancelled: number;
  refundPending: number;
  totalRevenue: number;
  todayRevenue: number;
}

export interface FlightAdminListFilters {
  q?: string;
  status?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  airline?: string;
  route?: string;
  page?: number;
  pageSize?: number;
}

const PENDING_STATUSES = new Set<FlightBookingStatus>([
  "fare_validated",
  "payment_pending",
  "payment_success",
  "booking_pending",
  "hold",
]);

const CANCELLED_STATUSES = new Set<FlightBookingStatus>(["cancelled", "released"]);

const REFUND_PENDING_STATUSES = new Set<FlightBookingStatus>([
  "cancellation_requested",
  "refund_pending",
]);

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function computeFlightAdminStats(bookings: FlightBookingRecord[]): FlightAdminStats {
  const todayStart = startOfTodayIso();
  let totalRevenue = 0;
  let todayRevenue = 0;
  let confirmed = 0;
  let pending = 0;
  let manualReview = 0;
  let cancelled = 0;
  let refundPending = 0;

  for (const b of bookings) {
    if (b.paymentStatus === "paid" || b.paymentStatus === "refunded") {
      totalRevenue += b.totalFare || 0;
      if (b.createdAt >= todayStart) todayRevenue += b.totalFare || 0;
    }
    if (b.status === "confirmed") confirmed += 1;
    if (PENDING_STATUSES.has(b.status)) pending += 1;
    if (b.status === "manual_review_required") manualReview += 1;
    if (CANCELLED_STATUSES.has(b.status)) cancelled += 1;
    if (REFUND_PENDING_STATUSES.has(b.status)) refundPending += 1;
  }

  return {
    total: bookings.length,
    confirmed,
    pending,
    manualReview,
    cancelled,
    refundPending,
    totalRevenue,
    todayRevenue,
  };
}

export function filterFlightBookingsForAdmin(
  bookings: FlightBookingRecord[],
  filters: FlightAdminListFilters
): FlightBookingRecord[] {
  let list = [...bookings];
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    list = list.filter((b) => {
      const hay = [
        b.bookingId,
        b.tripjackBookingId,
        b.pnr,
        b.airlinePnr,
        b.customerName,
        b.customerEmail,
        b.customerMobile,
        b.sourceCode,
        b.destinationCode,
        b.airlineName,
        b.airlineCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  if (filters.status) {
    const status = filters.status;
    if (status === "pending") {
      list = list.filter((b) => PENDING_STATUSES.has(b.status));
    } else if (status === "failed") {
      list = list.filter(
        (b) => b.status === "payment_failed" || b.status === "booking_failed"
      );
    } else if (status === "cancelled") {
      list = list.filter((b) => CANCELLED_STATUSES.has(b.status));
    } else if (status === "refund_pending") {
      list = list.filter((b) => REFUND_PENDING_STATUSES.has(b.status));
    } else {
      list = list.filter((b) => b.status === status);
    }
  }

  if (filters.paymentStatus) {
    const map: Record<string, FlightPaymentStatus[]> = {
      payment_success: ["paid", "refunded", "refund_pending"],
      payment_failed: ["failed"],
      payment_pending: ["pending"],
    };
    const allowed = map[filters.paymentStatus] ?? [filters.paymentStatus as FlightPaymentStatus];
    list = list.filter((b) => allowed.includes(b.paymentStatus));
  }

  if (filters.dateFrom) {
    list = list.filter((b) => (b.travelDate || b.createdAt.slice(0, 10)) >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    list = list.filter((b) => (b.travelDate || b.createdAt.slice(0, 10)) <= filters.dateTo!);
  }
  if (filters.airline) {
    const airline = filters.airline.toLowerCase();
    list = list.filter(
      (b) =>
        b.airlineCode.toLowerCase() === airline ||
        b.airlineName.toLowerCase().includes(airline)
    );
  }
  if (filters.route) {
    const route = filters.route.toUpperCase().replace(/\s+/g, "");
    list = list.filter(
      (b) => `${b.sourceCode}${b.destinationCode}` === route ||
        `${b.sourceCode}-${b.destinationCode}` === route ||
        `${b.sourceCode}→${b.destinationCode}` === route
    );
  }

  return list;
}

/** Strip sensitive / heavy fields based on role. */
export function sanitizeFlightBookingForAdmin(
  booking: FlightBookingRecord,
  role: AuthenticatedUser["role"]
): FlightBookingRecord {
  const notes = getAdminNotesHistory(booking);
  const base: FlightBookingRecord = {
    ...booking,
    adminNotesHistory: notes,
  };

  if (canManageFlightBookingsAdmin(role)) {
    return base;
  }

  // Manager: full details, no raw API payloads
  if (canViewFlightBookingFullDetails(role)) {
    return {
      ...base,
      reviewResponse: undefined,
      fareValidateResponse: undefined,
      fareValidateRequest: undefined,
      bookRequest: undefined,
      bookResponse: undefined,
      bookingDetailsResponse: undefined,
      bookingDetailResponse: undefined,
      getChargesRequest: undefined,
      getChargesResponse: undefined,
      submitAmendmentRequest: undefined,
      submitAmendmentResponse: undefined,
      pollAmendmentResponse: undefined,
      releasePnrRequest: undefined,
      releasePnrResponse: undefined,
    };
  }

  // Sales / support: basic only
  return {
    bookingId: booking.bookingId,
    tripjackBookingId: booking.tripjackBookingId,
    userId: booking.userId,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerMobile: booking.customerMobile,
    tripType: booking.tripType,
    sourceCode: booking.sourceCode,
    destinationCode: booking.destinationCode,
    sourceCity: booking.sourceCity,
    destinationCity: booking.destinationCity,
    travelDate: booking.travelDate,
    airlineName: booking.airlineName,
    airlineCode: booking.airlineCode,
    flightNumber: booking.flightNumber,
    departureTime: booking.departureTime,
    arrivalTime: booking.arrivalTime,
    durationFormatted: booking.durationFormatted,
    passengers: booking.passengers.map((p) => ({
      ti: p.ti,
      pt: p.pt,
      fN: p.fN,
      lN: p.lN,
      gender: p.gender,
      dateOfBirth: "",
      nationality: "",
      passportNumber: "",
    })),
    delivery: booking.delivery,
    totalFare: booking.totalFare,
    baseFare: booking.baseFare,
    taxesAndFees: booking.taxesAndFees,
    priceId: booking.priceId,
    fareIdentifier: booking.fareIdentifier,
    pnr: booking.pnr,
    airlinePnr: booking.airlinePnr,
    ticketNumber: booking.ticketNumber,
    ticketStatus: booking.ticketStatus,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    refundStatus: booking.refundStatus,
    refundAmount: booking.refundAmount,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
    adminNotesHistory: notes,
  };
}

export async function loadAdminFlightBookings(filters: FlightAdminListFilters) {
  const all = await listAllFlightBookingsForAdmin(500);
  const stats = computeFlightAdminStats(all);
  const filtered = filterFlightBookingsForAdmin(all, filters);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 20));
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  const airlines = [...new Set(all.map((b) => b.airlineCode).filter(Boolean))].sort();
  const routes = [
    ...new Set(all.map((b) => `${b.sourceCode}-${b.destinationCode}`).filter((r) => r !== "-")),
  ].sort();

  return {
    bookings: items,
    total: filtered.length,
    page,
    pageSize,
    stats,
    airlines,
    routes,
  };
}

export async function addFlightAdminNote(
  bookingId: string,
  note: string,
  admin: AuthenticatedUser
): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const entry: FlightAdminNote = {
    note: note.trim(),
    adminId: admin.id,
    adminName: admin.name || admin.email || admin.id,
    createdAt: new Date().toISOString(),
  };
  const history = [...getAdminNotesHistory(booking), entry];
  const updated = await updateFlightBooking(bookingId, {
    adminNotesHistory: history,
    adminNotes: entry.note,
    lastAdminAction: "add_note",
    lastAdminActionAt: entry.createdAt,
  });
  if (!updated) throw new Error("Failed to save note");
  return updated;
}

export async function resolveFlightManualReview(
  bookingId: string,
  admin: AuthenticatedUser,
  note?: string
): Promise<FlightBookingRecord> {
  const booking = await getFlightBookingById(bookingId);
  if (!booking) throw new Error("Booking not found");

  const now = new Date().toISOString();
  let history = getAdminNotesHistory(booking);
  if (note?.trim()) {
    history = [
      ...history,
      {
        note: note.trim(),
        adminId: admin.id,
        adminName: admin.name || admin.email || admin.id,
        createdAt: now,
      },
    ];
  }

  const updated = await updateFlightBooking(bookingId, {
    manualReviewResolved: true,
    manualReviewResolvedBy: admin.name || admin.email || admin.id,
    manualReviewResolvedAt: now,
    status: booking.status === "manual_review_required" ? "confirmed" : booking.status,
    adminNotesHistory: history,
    lastAdminAction: "mark_manual_review_resolved",
    lastAdminActionAt: now,
  });
  if (!updated) throw new Error("Failed to resolve manual review");
  return updated;
}

export async function runFlightAdminAction(
  bookingId: string,
  action:
    | "refresh_detail"
    | "retry_booking_detail"
    | "retry_book"
    | "retry_poll"
    | "retry_release_pnr"
    | "add_note"
    | "mark_resolved",
  admin: AuthenticatedUser,
  note?: string
): Promise<FlightBookingRecord> {
  const manageActions = new Set([
    "refresh_detail",
    "retry_booking_detail",
    "retry_book",
    "retry_poll",
    "retry_release_pnr",
  ]);
  if (manageActions.has(action) && !canManageFlightBookingsAdmin(admin.role)) {
    throw new Error("Only Super Admin can retry TripJack actions");
  }

  const now = new Date().toISOString();
  let booking: FlightBookingRecord | null = null;

  switch (action) {
    case "refresh_detail":
    case "retry_booking_detail":
      booking = await refreshFlightBookingDetails(bookingId);
      break;
    case "retry_book":
      booking = await retryTripJackFlightBook(bookingId);
      break;
    case "retry_poll":
      booking = await pollFlightAmendment(bookingId);
      break;
    case "retry_release_pnr":
      booking = await releaseFlightPnr(bookingId);
      break;
    case "add_note":
      if (!note?.trim()) throw new Error("Note is required");
      booking = await addFlightAdminNote(bookingId, note, admin);
      break;
    case "mark_resolved":
      booking = await resolveFlightManualReview(bookingId, admin, note);
      break;
    default:
      throw new Error("Unknown action");
  }

  if (manageActions.has(action)) {
    const updated = await updateFlightBooking(bookingId, {
      lastAdminAction: action,
      lastAdminActionAt: now,
    });
    return updated ?? booking;
  }

  return booking;
}
