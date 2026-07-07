"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHotelBookingApi } from "@/hooks/use-hotel-booking";
import type { HotelBookingRecord } from "@/lib/hotels/types";
import { formatCurrency } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";

export function HotelVoucherView({ bookingId }: { bookingId: string }) {
  const { locale } = useAppStore();
  const api = useHotelBookingApi();
  const [booking, setBooking] = useState<HotelBookingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api.fetchBooking(bookingId).then((b) => {
      if (b) setBooking(b);
      setLoading(false);
    });
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4fa3]" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="py-16 text-center">
        <p className="font-semibold">Booking not found</p>
        <Link href="/account/hotel-bookings" className="mt-4 inline-block text-[#1a4fa3]">
          My hotel bookings
        </Link>
      </div>
    );
  }

  const guestCount = booking.rooms.reduce(
    (sum, r) => sum + (r.adults ?? 1) + (r.children ?? 0),
    0
  );

  return (
    <div className="min-h-screen bg-white print:bg-white">
      <div className="container mx-auto max-w-3xl px-4 py-8 print:py-4">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link href={`/hotels/booking-success?bookingId=${booking.bookingId}`} className="text-sm text-[#1a4fa3]">
            ← Back
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        <div className="rounded-2xl border-2 border-[#1a4fa3]/20 p-6 md:p-8">
          <div className="border-b pb-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">Safar Sathi · Hotel Voucher</p>
            <h1 className="mt-1 text-2xl font-bold text-[#1a4fa3]">{booking.hotelName}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Status: <span className="font-semibold capitalize">{booking.status.replace(/_/g, " ")}</span>
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Block label="Booking ID" value={booking.bookingId} />
            <Block label="Booking reference" value={booking.tripjackBookingId} />
            {booking.confirmationNumber && (
              <Block label="Confirmation / Voucher No." value={booking.confirmationNumber} />
            )}
            <Block label="Check-in" value={booking.checkIn} />
            <Block label="Check-out" value={booking.checkOut} />
            <Block label="Rooms" value={String(booking.rooms.length)} />
            <Block label="Guests" value={String(guestCount)} />
            <Block label="Room type" value={booking.roomName} />
            <Block label="Meal plan" value={booking.mealBasis} />
            <Block label="Lead guest" value={booking.customerName} />
            <Block label="Email" value={booking.customerEmail} />
            <Block label="Mobile" value={booking.customerMobile} />
            <Block label="Amount paid" value={formatCurrency(booking.totalFare, locale)} />
          </div>

          <div className="mt-8 border-t pt-4 text-xs text-slate-500">
            <p>Present this voucher at hotel check-in along with valid photo ID.</p>
            <p className="mt-1">For support, contact Safar Sathi with your booking ID.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
