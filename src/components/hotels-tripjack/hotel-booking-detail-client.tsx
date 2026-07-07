"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  Loader2,
  Printer,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { HotelCancellationTimeline } from "@/components/hotels-tripjack/hotel-cancellation-timeline";
import { HotelCancelDialog } from "@/components/hotels-tripjack/hotel-cancel-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth-context";
import { useHotelBookingApi } from "@/hooks/use-hotel-booking";
import { customerApiFetch } from "@/lib/admin/api-client";
import { getHotelInvoiceDownloadUrl } from "@/lib/hotels/invoice-access";
import type { HotelCancellationEstimate } from "@/lib/hotels/cancellation-estimate";
import { canCancelHotelBooking, isHotelVoucherReady } from "@/lib/hotels/booking-guards";
import {
  isHotelBookingConfirmedStatus,
  isHotelBookingTerminalFailure,
} from "@/lib/hotels/booking-status-helpers";
import type { HotelBookingRecord } from "@/lib/hotels/types";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { formatCurrency } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";

function statusBadge(status: string) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "cancelled" || status === "refunded") return "bg-red-100 text-red-800";
  if (status === "refund_pending" || status === "cancellation_requested") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-blue-100 text-blue-800";
}

export function HotelBookingDetailClient({ bookingId }: { bookingId: string }) {
  const { locale } = useAppStore();
  const { user } = useAuth();
  const api = useHotelBookingApi();
  const isStaff = user ? canShowAdminNav(user.role) : false;

  const [booking, setBooking] = useState<HotelBookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [estimate, setEstimate] = useState<HotelCancellationEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const applyBooking = useCallback((b: HotelBookingRecord) => setBooking(b), []);

  const loadBooking = useCallback(async () => {
    const b = await api.fetchBooking(bookingId, { publicAccess: true });
    if (b) applyBooking(b);
    setLoading(false);
  }, [bookingId, api, applyBooking]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  useEffect(() => {
    if (!booking) return;
    const shouldPoll =
      booking.paymentStatus === "paid" &&
      !isHotelBookingConfirmedStatus(booking) &&
      !isHotelBookingTerminalFailure(booking);
    if (!shouldPoll) return;

    let cancelled = false;
    void api.pollBookingStatus(booking.bookingId, (updated) => {
      if (!cancelled) applyBooking(updated);
    });

    return () => {
      cancelled = true;
    };
  }, [booking?.bookingId, booking?.status, booking?.paymentStatus, api, applyBooking]);

  const refreshStatus = async () => {
    setRefreshing(true);
    try {
      const res = await customerApiFetch(`/api/hotels/bookings/${bookingId}/refresh-detail`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Refresh failed");
      applyBooking(json.data.booking);
      toast.success("Booking status updated");
      if (isStaff && json.data.debug) console.log("[hotel-detail] refresh:", json.data.debug);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not refresh status");
    } finally {
      setRefreshing(false);
    }
  };

  const downloadInvoice = async () => {
    if (!booking) return;
    setDownloading(true);
    try {
      const res = await fetch(getHotelInvoiceDownloadUrl(booking.bookingId, booking.customerEmail));
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
      setDownloading(false);
    }
  };

  const openCancel = async () => {
    setCancelOpen(true);
    setCancelError(null);
    setLoadingEstimate(true);
    try {
      const res = await customerApiFetch(`/api/hotels/bookings/${bookingId}/cancel`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Could not load cancellation info");
      setEstimate(json.data.estimate);
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Failed to load estimate");
    } finally {
      setLoadingEstimate(false);
    }
  };

  const confirmCancel = async () => {
    setConfirmingCancel(true);
    setCancelError(null);
    try {
      const res = await customerApiFetch(`/api/hotels/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: "Customer requested cancellation" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Cancellation failed");
      applyBooking(json.data.booking);
      setCancelOpen(false);
      toast.success(json.data.message ?? "Cancellation submitted");
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : "Cancellation failed");
    } finally {
      setConfirmingCancel(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4fa3]" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] py-16 text-center">
        <p className="font-semibold">Booking not found</p>
        <Link href="/account/hotel-bookings" className="mt-4 inline-block text-[#1a4fa3]">
          My hotel bookings
        </Link>
      </div>
    );
  }

  const voucherReady = isHotelVoucherReady(booking);
  const canCancel = canCancelHotelBooking(booking);
  const penalties = booking.reviewNormalized?.option.penalties ?? [];
  const guestCount = booking.rooms.reduce(
    (sum, r) => sum + (r.adults ?? 1) + (r.children ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <Link href="/account/hotel-bookings" className="text-sm text-[#1a4fa3] hover:underline">
            ← My hotel bookings
          </Link>
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{booking.hotelName}</h1>
              <p className="text-sm text-slate-600">{booking.bookingId}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={`border-0 ${statusBadge(booking.status)}`}>
                {booking.status.replace(/_/g, " ")}
              </Badge>
              {booking.refundStatus && booking.refundStatus !== "NONE" && (
                <Badge variant="outline">Refund: {booking.refundStatus.toLowerCase()}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl space-y-5 px-4 py-8">
        {!voucherReady && booking.status === "confirmed" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Voucher is being generated</p>
            <p className="mt-1">Your booking is confirmed. The voucher may take a few minutes.</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 rounded-xl"
              disabled={refreshing}
              onClick={() => void refreshStatus()}
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh status
            </Button>
          </div>
        )}

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Booking details</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <Item label="Booking reference" value={booking.tripjackBookingId} />
            <Item label="Supplier reference" value={booking.supplierReference ?? "—"} />
            <Item label="Confirmation / voucher" value={booking.confirmationNumber ?? booking.voucherNumber ?? "—"} />
            <Item label="Check-in" value={booking.checkIn} />
            <Item label="Check-out" value={booking.checkOut} />
            <Item label="Room" value={booking.roomName} />
            <Item label="Meal plan" value={booking.mealBasis} />
            <Item label="Guests" value={String(guestCount)} />
            <Item label="Lead guest" value={booking.customerName} />
            <Item label="Amount paid" value={formatCurrency(booking.totalFare, locale)} highlight />
            <Item label="Payment" value={booking.paymentStatus} />
            {booking.razorpayPaymentId && <Item label="Payment ID" value={booking.razorpayPaymentId} mono />}
            {booking.lastStatusCheckedAt && (
              <Item label="Last checked" value={new Date(booking.lastStatusCheckedAt).toLocaleString()} />
            )}
          </dl>
        </div>

        {penalties.length > 0 && (
          <HotelCancellationTimeline
            isRefundable={booking.reviewNormalized?.option.isRefundable ?? true}
            freeCancellationUntil={booking.reviewNormalized?.option.freeCancellationUntil ?? ""}
            penalties={penalties}
            locale={locale}
          />
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={refreshing}
            onClick={() => void refreshStatus()}
          >
            {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Refresh status
          </Button>
          {booking.paymentStatus === "paid" && (
            <Button variant="outline" className="rounded-xl" disabled={downloading} onClick={() => void downloadInvoice()}>
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Invoice
            </Button>
          )}
          {voucherReady && (
            <>
              {booking.voucherUrl && (
                <a href={booking.voucherUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="rounded-xl">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Download voucher
                  </Button>
                </a>
              )}
              <Link href={`/hotels/voucher/${booking.bookingId}`}>
                <Button variant="outline" className="rounded-xl">
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </Link>
            </>
          )}
          {canCancel && (
            <Button
              variant="outline"
              className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => void openCancel()}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel booking
            </Button>
          )}
        </div>

        {isStaff && booking.bookingDetailsResponse != null && (
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="mb-2 text-sm font-semibold text-slate-700">Admin: TripJack details response</p>
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
              {JSON.stringify(booking.bookingDetailsResponse, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <HotelCancelDialog
        open={cancelOpen}
        estimate={estimate}
        loadingEstimate={loadingEstimate}
        confirming={confirmingCancel}
        error={cancelError}
        locale={locale}
        onClose={() => setCancelOpen(false)}
        onRetryEstimate={() => void openCancel()}
        onConfirm={() => void confirmCancel()}
      />
    </div>
  );
}

function Item({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase text-slate-400">{label}</dt>
      <dd
        className={`mt-0.5 font-medium ${highlight ? "text-lg text-[#1a4fa3]" : "text-slate-900"} ${mono ? "font-mono text-xs break-all" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
