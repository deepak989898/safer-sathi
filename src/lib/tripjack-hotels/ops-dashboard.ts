import { listAllHotelBookingsForAdmin } from "@/lib/hotels/firestore";
import type { HotelBookingRecord } from "@/lib/hotels/types";
import { getTripJackHotelCatalogMeta } from "@/lib/tripjack-hotels/catalog-firestore";
import {
  countRecentTripJackHotelApiErrors,
  getTripJackHotelOpsMeta,
  listTripJackHotelSyncLogs,
} from "@/lib/tripjack-hotels/ops-firestore";
import {
  getTripJackHotelEnvironmentSummary,
  isTripJackHotelLiveBookingAllowed,
} from "@/lib/tripjack-hotels/config";

export interface TripJackHotelOpsDashboard {
  environment: ReturnType<typeof getTripJackHotelEnvironmentSummary>;
  catalogMeta: Awaited<ReturnType<typeof getTripJackHotelCatalogMeta>>;
  todayBookings: number;
  todayRevenue: number;
  totalRevenue: number;
  tripjackPayableEstimate: number;
  commissionEstimate: number;
  refundPending: number;
  failedBookings: number;
  cancellationRequests: number;
  voucherPending: number;
  apiErrorsToday: number;
  recentSyncLogs: Awaited<ReturnType<typeof listTripJackHotelSyncLogs>>;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function loadTripJackHotelOpsDashboard(): Promise<TripJackHotelOpsDashboard> {
  const opsMeta = await getTripJackHotelOpsMeta();
  const catalogMeta = await getTripJackHotelCatalogMeta();
  const environment = getTripJackHotelEnvironmentSummary(opsMeta.liveBookingEnabled);
  const todayStart = startOfTodayIso();

  const bookings = await listAllHotelBookingsForAdmin(2000);
  let todayBookings = 0;
  let todayRevenue = 0;
  let totalRevenue = 0;
  let tripjackPayableEstimate = 0;
  let refundPending = 0;
  let failedBookings = 0;
  let cancellationRequests = 0;
  let voucherPending = 0;

  for (const b of bookings) {
    if (b.paymentStatus === "paid" || b.paymentStatus === "refunded") {
      totalRevenue += b.totalFare || 0;
      tripjackPayableEstimate += b.baseFare || b.totalFare * 0.85 || 0;
      if (b.createdAt >= todayStart) {
        todayBookings += 1;
        todayRevenue += b.totalFare || 0;
      }
    }
    if (b.status === "refund_pending" || b.refundStatus === "PENDING" || b.refundStatus === "PROCESSING") {
      refundPending += 1;
    }
    if (b.status === "booking_failed" || b.status === "payment_failed" || b.status === "manual_review_required") {
      failedBookings += 1;
    }
    if (b.status === "cancellation_requested") cancellationRequests += 1;
    if (
      b.status === "confirmed" &&
      b.paymentStatus === "paid" &&
      !b.voucherUrl &&
      !b.confirmationNumber
    ) {
      voucherPending += 1;
    }
  }

  const commissionEstimate = Math.max(0, totalRevenue - tripjackPayableEstimate);
  const apiErrorsToday = await countRecentTripJackHotelApiErrors(todayStart);
  const recentSyncLogs = await listTripJackHotelSyncLogs(10);

  return {
    environment: {
      ...environment,
      liveBookingAllowed: isTripJackHotelLiveBookingAllowed(opsMeta.liveBookingEnabled),
    },
    catalogMeta,
    todayBookings,
    todayRevenue,
    totalRevenue,
    tripjackPayableEstimate,
    commissionEstimate,
    refundPending,
    failedBookings,
    cancellationRequests,
    voucherPending,
    apiErrorsToday,
    recentSyncLogs,
  };
}

export function filterHotelBookingsForOps(
  bookings: HotelBookingRecord[],
  filters: {
    q?: string;
    status?: string;
    refundStatus?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): HotelBookingRecord[] {
  let rows = [...bookings];
  if (filters.q?.trim()) {
    const needle = filters.q.toLowerCase();
    rows = rows.filter((b) =>
      [
        b.bookingId,
        b.tripjackBookingId,
        b.hotelName,
        b.customerEmail,
        b.customerMobile,
        b.razorpayPaymentId ?? "",
      ].some((v) => v.toLowerCase().includes(needle))
    );
  }
  if (filters.status && filters.status !== "all") {
    rows = rows.filter((b) => b.status === filters.status);
  }
  if (filters.refundStatus && filters.refundStatus !== "all") {
    rows = rows.filter((b) => b.refundStatus === filters.refundStatus);
  }
  if (filters.dateFrom) {
    rows = rows.filter((b) => b.createdAt >= `${filters.dateFrom}T00:00:00.000Z`);
  }
  if (filters.dateTo) {
    rows = rows.filter((b) => b.createdAt <= `${filters.dateTo}T23:59:59.999Z`);
  }
  return rows;
}
