"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Clock, CreditCard, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/i18n";
import type { Locale } from "@/types";
import type { BusBookingRecord } from "@/lib/seatseller/types";

function BlockTimer({ expiresAt, onExpired }: { expiresAt: string; onExpired?: () => void }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      if (ms <= 0) {
        setRemaining("Expired");
        onExpired?.();
        return;
      }
      const m = Math.floor(ms / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setRemaining(`${m}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, onExpired]);

  const expired = remaining === "Expired";

  return (
    <Badge variant={expired ? "destructive" : "secondary"} className="gap-1">
      <Clock className="h-3 w-3" />
      {expired ? "Block expired" : `Seats held · ${remaining}`}
    </Badge>
  );
}

interface BusPaymentScreenProps {
  booking: BusBookingRecord | null;
  loading: boolean;
  loadError: string | null;
  locale: Locale;
  onPay: () => void;
}

export function BusPaymentScreen({
  booking,
  loading,
  loadError,
  locale,
  onPay,
}: BusPaymentScreenProps) {
  const [expired, setExpired] = useState(false);

  if (!booking && !loadError) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4fa3]" />
      </div>
    );
  }

  if (loadError || !booking) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-slate-600">{loadError ?? "Booking not found"}</p>
        <Link href="/bus/search" className="mt-4 inline-block text-[#1a4fa3] hover:underline">
          Start new search
        </Link>
      </div>
    );
  }

  const blocked = booking.status === "seat_blocked" || booking.status === "payment_pending";

  return (
    <div className="min-h-screen bg-slate-100 pb-12">
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/bus/passenger-details"
            className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-[#1a4fa3]"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-xl font-bold text-slate-900 md:text-2xl">Complete payment</h1>
            {booking.blockExpiresAt && (
              <BlockTimer expiresAt={booking.blockExpiresAt} onExpired={() => setExpired(true)} />
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-6 lg:grid-cols-[1fr_340px]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="space-y-4 pt-6">
            <h2 className="font-semibold text-slate-900">Journey details</h2>
            <div className="grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="text-slate-500">Route:</span> {booking.sourceCityName} →{" "}
                {booking.destinationCityName}
              </p>
              <p>
                <span className="text-slate-500">Date:</span> {booking.doj}
              </p>
              <p>
                <span className="text-slate-500">Operator:</span> {booking.operatorName}
              </p>
              <p>
                <span className="text-slate-500">Bus:</span> {booking.busType}
              </p>
              <p>
                <span className="text-slate-500">Seats:</span> {booking.seatNames.join(", ")}
              </p>
              <p>
                <span className="text-slate-500">Boarding:</span> {booking.boardingPoint.time} —{" "}
                {booking.boardingPoint.location}
              </p>
              <p className="md:col-span-2">
                <span className="text-slate-500">Dropping:</span> {booking.droppingPoint.time} —{" "}
                {booking.droppingPoint.location}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-700">Passengers</h3>
              <ul className="space-y-2 text-sm">
                {booking.passengerDetails.map((p) => (
                  <li key={p.seatName} className="flex justify-between gap-2">
                    <span>
                      {p.name} · Seat {p.seatName} · {p.gender}
                    </span>
                    <span className="font-medium">{formatCurrency(p.fare, locale)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit rounded-2xl border-slate-200 shadow-sm lg:sticky lg:top-24">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2 text-slate-700">
              <Shield className="h-4 w-4 text-[#1a4fa3]" />
              <span className="text-sm">Secure payment via Razorpay</span>
            </div>
            <div className="space-y-1 border-b border-slate-200 pb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Base fare</span>
                <span>{formatCurrency(booking.baseFare, locale)}</span>
              </div>
              {booking.taxes > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxes & fees</span>
                  <span>{formatCurrency(booking.taxes, locale)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#1a4fa3]">
                <span>Total payable</span>
                <span>{formatCurrency(booking.totalFare, locale)}</span>
              </div>
            </div>

            {expired && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                Your seat block has expired. Please search again and re-select seats.
              </p>
            )}

            <Button
              className="h-12 w-full rounded-xl bg-[#1a4fa3] text-base font-semibold hover:bg-[#163f85]"
              disabled={loading || expired || !blocked}
              onClick={onPay}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-5 w-5" />
              )}
              Pay with Razorpay
            </Button>

            <p className="text-center text-xs text-slate-500">
              Booking ID: {booking.bookingId}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
