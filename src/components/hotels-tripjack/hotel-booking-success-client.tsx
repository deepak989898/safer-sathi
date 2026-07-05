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
import { Button } from "@/components/ui/button";
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
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4fa3]" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#f4f7fb] py-16 text-center">
        <p className="font-semibold text-slate-900">Booking not found</p>
        <Link href="/hotels/search" className="mt-4 inline-block text-[#1a4fa3] hover:underline">
          Search hotels
        </Link>
      </div>
    );
  }

  const confirmed = booking.status === "confirmed";
  const pending = booking.status === "manual_review_required" || booking.status === "booking_pending";
  const guestCount = booking.rooms.reduce(
    (sum, r) => sum + (r.adults ?? 1) + (r.children ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-3xl border bg-white p-8 text-center shadow-sm">
          <CheckCircle2
            className={`mx-auto h-14 w-14 ${confirmed ? "text-emerald-500" : pending ? "text-amber-500" : "text-[#1a4fa3]"}`}
          />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            {confirmed ? "Booking Confirmed!" : pending ? "Payment Received" : "Booking Status"}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {confirmed
              ? "Your hotel reservation is confirmed. Confirmation email sent."
              : pending
                ? "Payment received. Hotel confirmation is being processed."
                : booking.status.replace(/_/g, " ")}
          </p>

          <div className="mt-8 space-y-3 rounded-2xl bg-slate-50 p-5 text-left text-sm">
            <Row label="Hotel" value={booking.hotelName} />
            <Row label="Booking ID" value={booking.bookingId} mono />
            <Row label="TripJack Ref" value={booking.tripjackBookingId} mono />
            {booking.confirmationNumber && (
              <Row label="Voucher / Confirmation" value={booking.confirmationNumber} mono />
            )}
            <Row label="Check-in" value={booking.checkIn} />
            <Row label="Check-out" value={booking.checkOut} />
            <Row label="Rooms" value={String(booking.rooms.length)} />
            <Row label="Guests" value={String(guestCount)} />
            <Row label="Room type" value={booking.roomName} />
            <Row label="Meal plan" value={booking.mealBasis} />
            <Row
              label="Amount paid"
              value={formatCurrency(booking.totalFare, locale)}
              highlight
            />
            {booking.razorpayPaymentId && (
              <Row label="Payment ID" value={booking.razorpayPaymentId} mono />
            )}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={downloading}
              onClick={() => void downloadInvoice()}
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download Invoice
            </Button>
            {booking.voucherUrl && (
              <a href={booking.voucherUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="rounded-xl">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Download Voucher
                </Button>
              </a>
            )}
            <Link href={`/hotels/voucher/${booking.bookingId}`}>
              <Button variant="outline" className="rounded-xl">
                <Printer className="mr-2 h-4 w-4" />
                Print Booking
              </Button>
            </Link>
            <Link href="/">
              <Button className="rounded-xl bg-[#1a4fa3] hover:bg-[#16408a]">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          <Link
            href={`/hotels/booking/${booking.bookingId}`}
            className="mt-4 inline-block text-sm text-[#1a4fa3] hover:underline"
          >
            View booking details →
          </Link>
        </div>
      </div>
    </div>
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
      <span className="text-slate-500">{label}</span>
      <span
        className={`text-right ${mono ? "font-mono text-xs" : ""} ${highlight ? "font-bold text-[#1a4fa3]" : "font-medium text-slate-900"}`}
      >
        {value}
      </span>
    </div>
  );
}
