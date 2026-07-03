"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/i18n";
import type { FlightBookingRecord } from "@/lib/flights/types";
import type {
  FlightPassengerFormRow,
  NormalizedFareValidate,
  NormalizedFlightReview,
} from "@/lib/tripjack/types";
import type { FlightSearchContext } from "@/lib/flights/flight-session";
import type { Locale } from "@/types";

interface FlightPaymentScreenProps {
  review: NormalizedFlightReview;
  validated: NormalizedFareValidate;
  passengers: FlightPassengerFormRow[];
  customerEmail: string;
  customerMobile: string;
  context: FlightSearchContext | null;
  booking: FlightBookingRecord | null;
  loading: boolean;
  error: string | null;
  locale: Locale;
  onPay: () => void;
}

export function FlightPaymentScreen({
  review,
  validated,
  passengers,
  customerEmail,
  customerMobile,
  context,
  booking,
  loading,
  error,
  locale,
  onPay,
}: FlightPaymentScreenProps) {
  const displayReview = validated;
  const totalFare = validated.totalFare;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-[#1a4fa3] text-white">
        <div className="container mx-auto px-4 py-5">
          <Link
            href="/flights/passengers"
            className="mb-2 inline-flex items-center text-sm text-blue-100 hover:text-white"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to passengers
          </Link>
          <h1 className="text-2xl font-bold">Payment</h1>
          <p className="text-sm text-blue-100">
            {context?.params.fromCode ?? review.departureAirportCode} →{" "}
            {context?.params.toCode ?? review.arrivalAirportCode}
            {context?.params.departureDate ? ` · ${context.params.departureDate}` : ""}
          </p>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {error && (
            <Card className="rounded-2xl border-red-200 bg-red-50">
              <CardContent className="flex items-start gap-3 pt-5 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                {error}
              </CardContent>
            </Card>
          )}

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-2">
                <Plane className="h-5 w-5 text-[#1a4fa3]" />
                <p className="font-semibold text-slate-900">Flight summary</p>
              </div>
              <p className="text-sm text-slate-700">
                {displayReview.airlineName} · {displayReview.airlineCode}{" "}
                {displayReview.flightNumber}
              </p>
              <p className="text-sm text-slate-600">
                {displayReview.departureAirportCode} → {displayReview.arrivalAirportCode}
              </p>
              <p className="text-sm text-slate-600">
                {displayReview.departureTime} – {displayReview.arrivalTime} ·{" "}
                {displayReview.durationFormatted}
              </p>
              <p className="text-xs text-slate-500">
                {displayReview.refundableType || review.refundableType}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="space-y-3 pt-6">
              <p className="font-semibold text-slate-900">Passengers</p>
              {passengers.map((p, i) => (
                <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-900">
                    {p.ti} {p.fN} {p.lN}
                  </p>
                  <p className="text-xs text-slate-500">{p.pt}</p>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3 text-sm text-slate-600">
                <p>Email: {customerEmail}</p>
                <p>Mobile: {customerMobile}</p>
              </div>
            </CardContent>
          </Card>

          <Button
            className="h-12 w-full rounded-xl bg-[#1a4fa3] hover:bg-[#16408a]"
            disabled={loading || !booking}
            onClick={onPay}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing payment...
              </>
            ) : (
              `Pay ${formatCurrency(totalFare, locale)}`
            )}
          </Button>

          <p className="text-center text-xs text-slate-500">
            Secure payment via Razorpay. Your ticket will be issued only after successful payment.
          </p>
        </div>

        <aside>
          <Card className="sticky top-24 rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="space-y-3 pt-6">
              <p className="font-semibold text-slate-900">Fare summary</p>
              <div className="text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Base fare</span>
                  <span>{formatCurrency(validated.baseFare, locale)}</span>
                </div>
                <div className="mt-1 flex justify-between text-slate-600">
                  <span>Taxes & fees</span>
                  <span>{formatCurrency(validated.taxesAndFees, locale)}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-[#1a4fa3]">
                  <span>Total payable</span>
                  <span>{formatCurrency(totalFare, locale)}</span>
                </div>
              </div>
              {validated.bookingId && (
                <p className="text-[10px] text-slate-400">TripJack ref: {validated.bookingId}</p>
              )}
              {booking && (
                <p className="text-[10px] text-slate-400">Order ref: {booking.bookingId}</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
