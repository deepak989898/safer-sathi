"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Download, ExternalLink } from "lucide-react";
import { RequireAuth } from "@/components/auth/require-auth";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import { HotelCard, HotelPrimaryButton, HotelStatusBadge } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { useHotelBookingApi } from "@/hooks/use-hotel-booking";
import { customerApiFetch } from "@/lib/admin/api-client";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { canCancelHotelBooking } from "@/lib/hotels/booking-guards";
import {
  isHotelBookingCompleted,
  isHotelBookingPendingStatus,
  isHotelBookingUpcoming,
} from "@/lib/hotels/booking-status-helpers";
import { formatCurrency } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import type { HotelBookingRecord, HotelBookingStatus } from "@/lib/hotels/types";

const TABS: Array<{ id: string; label: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "refund_pending", label: "Refund Pending" },
  { id: "failed", label: "Failed" },
];

import { toast } from "sonner";

function statusKind(status: HotelBookingStatus): "confirmed" | "pending" | "cancelled" | "default" {
  if (status === "confirmed") return "confirmed";
  if (status === "cancelled" || status === "refunded") return "cancelled";
  if (status === "booking_pending" || status === "manual_review_required" || status === "refund_pending") {
    return "pending";
  }
  return "default";
}

function HotelBookingsContent() {
  const { locale } = useAppStore();
  const api = useHotelBookingApi();
  const [bookings, setBookings] = useState<HotelBookingRecord[]>([]);
  const [tab, setTab] = useState("upcoming");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    void api.fetchMyBookings().then((data) => data && setBookings(data));
  }, []);

  const filtered = useMemo(() => {
    if (tab === "all") return bookings;
    if (tab === "pending") {
      return bookings.filter(
        (b) =>
          isHotelBookingPendingStatus(b) ||
          b.status === "manual_review_required" ||
          b.status === "payment_success"
      );
    }
    if (tab === "upcoming") {
      return bookings.filter((b) => isHotelBookingUpcoming(b));
    }
    if (tab === "completed") {
      return bookings.filter((b) => isHotelBookingCompleted(b));
    }
    if (tab === "cancelled") {
      return bookings.filter((b) =>
        ["cancelled", "cancellation_requested", "refunded"].includes(b.status)
      );
    }
    if (tab === "refund_pending") {
      return bookings.filter(
        (b) =>
          b.status === "refund_pending" ||
          b.refundStatus === "PENDING" ||
          b.refundStatus === "PROCESSING"
      );
    }
    if (tab === "failed") {
      return bookings.filter((b) =>
        ["booking_failed", "payment_failed", "manual_review_required"].includes(b.status)
      );
    }
    return bookings;
  }, [bookings, tab]);

  const downloadInvoice = async (booking: HotelBookingRecord) => {
    setDownloadingId(booking.bookingId);
    try {
      const res = await customerApiFetch(`/api/hotels/bookings/${booking.bookingId}/invoice`);
      if (!res.ok) throw new Error("Could not download invoice");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SafarSathi-Hotel-Invoice-${booking.confirmationNumber ?? booking.bookingId.slice(-8)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invoice download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <HotelBookingLayout
      hero
      title="My Hotel Bookings"
      subtitle="TripJack hotel reservations"
      maxWidth="xl"
    >
      <div className="mb-6">
        <Link href="/hotels/search">
          <HotelPrimaryButton className="!w-auto px-6">
            <Building2 className="mr-2 inline h-4 w-4" />
            Book a new hotel
          </HotelPrimaryButton>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 border-b pb-4" style={{ borderColor: HOTEL_UI.border }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className="px-4 py-2 text-sm font-semibold transition"
            style={{
              color: tab === t.id ? HOTEL_UI.action : HOTEL_UI.textMuted,
              borderBottom: tab === t.id ? `2px solid ${HOTEL_UI.action}` : "2px solid transparent",
            }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <HotelCard className="py-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-semibold" style={{ color: HOTEL_UI.primary }}>
            No bookings in this category
          </p>
        </HotelCard>
      )}

      <div className="space-y-4">
        {filtered.map((b) => (
          <HotelCard key={b.bookingId}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-bold" style={{ color: HOTEL_UI.primary }}>
                    {b.hotelName}
                  </p>
                  <HotelStatusBadge status={statusKind(b.status)} />
                </div>
                <p className="mt-1 text-sm" style={{ color: HOTEL_UI.textMuted }}>
                  {b.checkIn} → {b.checkOut} · {b.roomName}
                </p>
                <p className="mt-1 text-xs" style={{ color: HOTEL_UI.textMuted }}>
                  {b.confirmationNumber ? `Voucher ${b.confirmationNumber}` : b.bookingId}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold" style={{ color: HOTEL_UI.primary }}>
                  {formatCurrency(b.totalFare, locale)}
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Link href={`/hotels/booking/${b.bookingId}`}>
                    <HotelPrimaryButton className="!h-9 !w-auto px-4 text-xs" variant="outline">
                      View Details
                    </HotelPrimaryButton>
                  </Link>
                  {b.paymentStatus === "paid" && (
                    <HotelPrimaryButton
                      className="!h-9 !w-auto px-4 text-xs"
                      variant="outline"
                      disabled={downloadingId === b.bookingId}
                      onClick={() => void downloadInvoice(b)}
                    >
                      <Download className="mr-1 inline h-3.5 w-3.5" />
                      Invoice
                    </HotelPrimaryButton>
                  )}
                  {b.voucherUrl && (
                    <a href={b.voucherUrl} target="_blank" rel="noopener noreferrer">
                      <HotelPrimaryButton className="!h-9 !w-auto px-4 text-xs" variant="outline">
                        <ExternalLink className="mr-1 inline h-3.5 w-3.5" />
                        Voucher
                      </HotelPrimaryButton>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </HotelCard>
        ))}
      </div>
    </HotelBookingLayout>
  );
}

export default function AccountHotelBookingsPage() {
  return (
    <RequireAuth>
      <HotelBookingsContent />
    </RequireAuth>
  );
}
