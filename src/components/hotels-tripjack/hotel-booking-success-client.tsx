"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Home,
  Loader2,
  Printer,
} from "lucide-react";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import {
  HotelCard,
  HotelPrimaryButton,
  HotelStatusBadge,
} from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { useHotelBookingApi } from "@/hooks/use-hotel-booking";
import { customerApiFetch } from "@/lib/admin/api-client";
import type { HotelBookingRecord } from "@/lib/hotels/types";
import { formatCurrency } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

function loadSessionBooking(): HotelBookingRecord | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("tripjack_hotel_confirmed_booking");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HotelBookingRecord;
  } catch {
    return null;
  }
}

export function HotelBookingSuccessClient() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") ?? "";
  const { locale } = useAppStore();
  const api = useHotelBookingApi();
  const [booking, setBooking] = useState<HotelBookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const sessionBooking = loadSessionBooking();
    if (sessionBooking && (!bookingId || sessionBooking.bookingId === bookingId)) {
      setBooking(sessionBooking);
      setLoading(false);
      return;
    }
    if (!bookingId) {
      setLoading(false);
      return;
    }
    void api.fetchBooking(bookingId).then((b) => {
      if (b) setBooking(b);
      setLoading(false);
    });
  }, [bookingId]);

  const downloadInvoice = async () => {
    if (!booking) return;
    setDownloading(true);
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
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: HOTEL_UI.bg }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: HOTEL_UI.action }} />
      </div>
    );
  }

  if (!booking) {
    return (
      <HotelBookingLayout title="Booking not found" maxWidth="md">
        <Link href="/hotels/search" style={{ color: HOTEL_UI.action }}>
          Search hotels
        </Link>
      </HotelBookingLayout>
    );
  }

  const confirmed = booking.status === "confirmed";
  const pending = booking.status === "manual_review_required" || booking.status === "booking_pending";
  const guestCount = booking.rooms.reduce(
    (sum, r) => sum + (r.adults ?? 1) + (r.children ?? 0),
    0
  );

  return (
    <HotelBookingLayout maxWidth="md">
      <HotelCard padding="lg" className="text-center">
        <CheckCircle2
          className="mx-auto h-16 w-16"
          style={{ color: confirmed ? HOTEL_UI.success : pending ? HOTEL_UI.pending : HOTEL_UI.action }}
        />
        <h1 className="mt-4 text-2xl font-bold" style={{ color: HOTEL_UI.primary }}>
          {confirmed ? "Booking Confirmed!" : pending ? "Payment Received" : "Booking Status"}
        </h1>
        <p className="mt-2 text-sm" style={{ color: HOTEL_UI.textMuted }}>
          {confirmed
            ? "Your hotel reservation is confirmed. Confirmation email sent."
            : pending
              ? "Payment received. Booking confirmation is in progress."
              : booking.status.replace(/_/g, " ")}
        </p>

        <div className="mt-2 flex justify-center">
          <HotelStatusBadge status={confirmed ? "confirmed" : pending ? "pending" : "default"} />
        </div>

        <div
          className="mt-8 space-y-3 border p-5 text-left text-sm"
          style={{ backgroundColor: "#FAFBFC", borderColor: HOTEL_UI.border, borderRadius: HOTEL_UI.cardRadius }}
        >
          <Row label="Hotel" value={booking.hotelName} />
          <Row label="Booking ID" value={booking.bookingId} mono />
          <Row label="TripJack Ref" value={booking.tripjackBookingId} mono />
          {booking.confirmationNumber && (
            <Row label="Confirmation" value={booking.confirmationNumber} mono />
          )}
          <Row label="Check-in" value={booking.checkIn} />
          <Row label="Check-out" value={booking.checkOut} />
          <Row label="Guests" value={String(guestCount)} />
          <Row label="Room" value={booking.roomName} />
          <Row label="Amount paid" value={formatCurrency(booking.totalFare, locale)} highlight />
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <HotelPrimaryButton variant="outline" onClick={() => void downloadInvoice()} disabled={downloading}>
            <Download className="mr-2 inline h-4 w-4" />
            Download Invoice
          </HotelPrimaryButton>
          <Link href={`/hotels/booking/${booking.bookingId}`}>
            <HotelPrimaryButton>View Booking Details</HotelPrimaryButton>
          </Link>
          {booking.voucherUrl && (
            <a href={booking.voucherUrl} target="_blank" rel="noopener noreferrer" className="sm:col-span-2">
              <HotelPrimaryButton variant="outline">
                <ExternalLink className="mr-2 inline h-4 w-4" />
                Download Voucher
              </HotelPrimaryButton>
            </a>
          )}
          <Link href="/account/hotel-bookings" className="sm:col-span-2">
            <HotelPrimaryButton variant="outline">Go to My Bookings</HotelPrimaryButton>
          </Link>
          <Link href="/" className="sm:col-span-2">
            <HotelPrimaryButton variant="outline">
              <Home className="mr-2 inline h-4 w-4" />
              Back to Home
            </HotelPrimaryButton>
          </Link>
        </div>
      </HotelCard>
    </HotelBookingLayout>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span style={{ color: HOTEL_UI.textMuted }}>{label}</span>
      <span
        className={`text-right ${mono ? "font-mono text-xs" : ""} ${highlight ? "font-bold" : "font-medium"}`}
        style={{ color: highlight ? HOTEL_UI.primary : HOTEL_UI.text }}
      >
        {value}
      </span>
    </div>
  );
}
