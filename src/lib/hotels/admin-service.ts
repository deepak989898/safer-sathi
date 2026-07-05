import type { AuthenticatedUser } from "@/lib/auth/server-auth";
import {
  canManageHotelBookingsAdmin,
  canViewHotelBookingFullDetails,
} from "@/lib/hotels/admin-permissions";
import {
  getHotelBookingById,
  listAllHotelBookingsForAdmin,
  updateHotelBooking,
} from "@/lib/hotels/firestore";
import {
  refreshHotelBookingDetails,
  submitHotelCancellation,
} from "@/lib/hotels/post-booking-service";
import {
  resendHotelBookingEmail,
  sendHotelRefundProcessedNotification,
} from "@/lib/hotels/notifications";
import type {
  HotelBookingRecord,
  HotelBookingStatus,
  HotelPaymentStatus,
  HotelRefundStatus,
} from "@/lib/hotels/types";

export interface HotelAdminStats {
  total: number;
  confirmed: number;
  pending: number;
  manualReview: number;
  cancelled: number;
  failed: number;
  paymentPending: number;
  totalRevenue: number;
  todayRevenue: number;
}

export interface HotelAdminListFilters {
  q?: string;
  status?: string;
  paymentStatus?: string;
  refundStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

const PENDING_STATUSES = new Set<HotelBookingStatus>([
  "review_confirmed",
  "payment_pending",
  "payment_success",
  "booking_pending",
]);

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function computeHotelAdminStats(bookings: HotelBookingRecord[]): HotelAdminStats {
  const todayStart = startOfTodayIso();
  let totalRevenue = 0;
  let todayRevenue = 0;
  let confirmed = 0;
  let pending = 0;
  let manualReview = 0;
  let cancelled = 0;
  let failed = 0;
  let paymentPending = 0;

  for (const b of bookings) {
    if (b.paymentStatus === "paid" || b.paymentStatus === "refunded") {
      totalRevenue += b.totalFare || 0;
      if (b.createdAt >= todayStart) todayRevenue += b.totalFare || 0;
    }
    if (b.status === "confirmed") confirmed += 1;
    if (PENDING_STATUSES.has(b.status)) pending += 1;
    if (b.status === "manual_review_required") manualReview += 1;
    if (b.status === "cancelled" || b.status === "refunded") cancelled += 1;
    if (b.status === "booking_failed" || b.status === "payment_failed") failed += 1;
    if (b.paymentStatus === "pending" && b.status !== "cancelled") paymentPending += 1;
  }

  return {
    total: bookings.length,
    confirmed,
    pending,
    manualReview,
    cancelled,
    failed,
    paymentPending,
    totalRevenue,
    todayRevenue,
  };
}

function matchesQuery(b: HotelBookingRecord, q: string): boolean {
  const needle = q.toLowerCase();
  return [
    b.bookingId,
    b.tripjackBookingId,
    b.hotelName,
    b.customerName,
    b.customerEmail,
    b.customerMobile,
    b.confirmationNumber ?? "",
  ].some((v) => v.toLowerCase().includes(needle));
}

export async function loadAdminHotelBookings(filters: HotelAdminListFilters = {}) {
  const all = await listAllHotelBookingsForAdmin(2000);
  let filtered = [...all];

  if (filters.q?.trim()) {
    filtered = filtered.filter((b) => matchesQuery(b, filters.q!.trim()));
  }
  if (filters.status && filters.status !== "all") {
    filtered = filtered.filter((b) => b.status === filters.status);
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    filtered = filtered.filter((b) => b.paymentStatus === filters.paymentStatus);
  }
  if (filters.refundStatus && filters.refundStatus !== "all") {
    filtered = filtered.filter((b) => b.refundStatus === filters.refundStatus);
  }
  if (filters.dateFrom) {
    filtered = filtered.filter((b) => b.createdAt >= `${filters.dateFrom}T00:00:00.000Z`);
  }
  if (filters.dateTo) {
    filtered = filtered.filter((b) => b.createdAt <= `${filters.dateTo}T23:59:59.999Z`);
  }

  const stats = computeHotelAdminStats(all);
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const start = (page - 1) * pageSize;
  const bookings = filtered.slice(start, start + pageSize);

  return {
    bookings,
    total: filtered.length,
    stats,
  };
}

export function sanitizeHotelBookingForAdmin(
  booking: HotelBookingRecord,
  role: AuthenticatedUser["role"]
): HotelBookingRecord {
  const full = canViewHotelBookingFullDetails(role);
  const manage = canManageHotelBookingsAdmin(role);

  if (full || manage) return booking;

  return {
    ...booking,
    bookRequest: undefined,
    bookResponse: manage ? booking.bookResponse : undefined,
    reviewResponse: undefined,
    adminNotesHistory: undefined,
  };
}

export async function adminUpdateHotelBooking(
  bookingId: string,
  input: {
    action?: string;
    status?: HotelBookingStatus;
    paymentStatus?: HotelPaymentStatus;
    adminNotes?: string;
    by: string;
  }
): Promise<HotelBookingRecord | null> {
  const existing = await getHotelBookingById(bookingId);
  if (!existing) return null;

  const updates: Partial<HotelBookingRecord> = {};

  if (input.status) updates.status = input.status;
  if (input.paymentStatus) updates.paymentStatus = input.paymentStatus;

  if (input.adminNotes?.trim()) {
    updates.adminNotes = input.adminNotes.trim();
    const history = existing.adminNotesHistory ?? [];
    history.push({
      at: new Date().toISOString(),
      by: input.by,
      note: input.adminNotes.trim(),
    });
    updates.adminNotesHistory = history;
  }

  if (input.action === "mark_confirmed") {
    updates.status = "confirmed";
    updates.manualReviewResolved = true;
  }
  if (input.action === "mark_cancelled") {
    updates.status = "cancelled";
  }
  if (input.action === "mark_refunded") {
    updates.status = "refunded";
    updates.paymentStatus = "refunded";
  }

  return updateHotelBooking(bookingId, updates);
}

export async function runHotelAdminAction(
  bookingId: string,
  input: {
    action: string;
    by: string;
    remarks?: string;
    refundReference?: string;
    refundNote?: string;
    refundAmount?: number;
    refundMode?: string;
  }
): Promise<HotelBookingRecord | null> {
  const existing = await getHotelBookingById(bookingId);
  if (!existing) return null;

  switch (input.action) {
    case "refresh_status":
      return refreshHotelBookingDetails(bookingId, input.by);
    case "cancel_booking":
      return submitHotelCancellation(bookingId, {
        remarks: input.remarks ?? "Admin requested cancellation",
        requestedBy: input.by,
      });
    case "mark_refund_processing":
      return updateHotelBooking(bookingId, {
        refundStatus: "PROCESSING",
        status: existing.status === "cancelled" ? "refund_pending" : existing.status,
      });
    case "mark_refunded": {
      const updated = await updateHotelBooking(bookingId, {
        refundStatus: "REFUNDED",
        status: "refunded",
        paymentStatus: "refunded",
        refundAmount: input.refundAmount ?? existing.expectedRefundAmount ?? existing.refundAmount,
        refundReference: input.refundReference ?? existing.refundReference,
        refundProcessedAt: new Date().toISOString(),
        refundNote: input.refundNote,
      });
      if (updated) {
        try {
          await sendHotelRefundProcessedNotification(updated);
          await updateHotelBooking(bookingId, { refundEmailSentAt: new Date().toISOString() });
        } catch (e) {
          console.warn("[hotel-admin] refund email failed:", e);
        }
      }
      return updated;
    }
    case "add_refund_reference":
      return updateHotelBooking(bookingId, {
        refundReference: input.refundReference,
        refundNote: input.refundNote,
        refundStatus: (existing.refundStatus ?? "MANUAL_REVIEW") as HotelRefundStatus,
      });
    case "resend_email":
      await resendHotelBookingEmail(existing, "confirmation");
      return existing;
    case "resend_voucher_email":
      await resendHotelBookingEmail(existing, "voucher");
      return updateHotelBooking(bookingId, { voucherEmailSentAt: new Date().toISOString() });
    case "mark_confirmed":
    case "mark_cancelled":
    case "mark_refunded_manual":
      return adminUpdateHotelBooking(bookingId, {
        action: input.action === "mark_refunded_manual" ? "mark_refunded" : input.action,
        by: input.by,
        adminNotes: input.refundNote,
      });
    case "retry_book": {
      const { retryTripJackHotelBook } = await import("@/lib/hotels/booking-service");
      return retryTripJackHotelBook(bookingId);
    }
    case "mark_voucher_sent":
      return updateHotelBooking(bookingId, { voucherSentAt: new Date().toISOString() });
    default:
      return null;
  }
}
