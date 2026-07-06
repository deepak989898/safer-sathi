"use client";

import Link from "next/link";
import { AlertCircle, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AirlineAvatar,
  FlightPageHeader,
  FlightRouteStrip,
  FlightSoftCard,
  FlightStepBar,
  flightPrimaryButtonClass,
} from "@/components/flights/flight-ui";
import { formatCurrency } from "@/lib/i18n";
import type { FlightBookingRecord } from "@/lib/flights/types";
import type {
  FlightPassengerFormRow,
  NormalizedFareValidate,
  NormalizedFlightReview,
} from "@/lib/tripjack/types";
import type { FlightSearchContext } from "@/lib/flights/flight-session";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

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
  testMode?: boolean;
  onPay: () => void;
  onSimulatePaymentSuccess?: () => void;
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
  testMode = false,
  onPay,
  onSimulatePaymentSuccess,
}: FlightPaymentScreenProps) {
  const totalFare = validated.totalFare;
  const fromCode = context?.params.fromCode ?? review.departureAirportCode;
  const toCode = context?.params.toCode ?? review.arrivalAirportCode;

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <FlightStepBar current="payment" />
      <FlightPageHeader
        title="Payment"
        subtitle={`${fromCode} → ${toCode}${context?.params.departureDate ? ` · ${context.params.departureDate}` : ""}`}
        backHref="/flights/passengers"
        backLabel="Back to passengers"
      />

      <div className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {error && (
            <FlightSoftCard className="border-red-200 bg-red-50">
              <div className="flex items-start gap-3 p-4 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                {error}
              </div>
            </FlightSoftCard>
          )}

          <FlightSoftCard>
            <div className="space-y-4 p-5 md:p-6">
              <div className="flex items-center gap-3">
                <AirlineAvatar
                  code={validated.airlineCode || review.airlineCode}
                  name={validated.airlineName || review.airlineName}
                  logoUrl={validated.airlineLogoUrl ?? review.airlineLogoUrl}
                />
                <div>
                  <p className="font-semibold text-slate-900">
                    {validated.airlineName || review.airlineName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {(validated.airlineCode || review.airlineCode)}{" "}
                    {validated.flightNumber || review.flightNumber}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <FlightRouteStrip
                  departureTime={validated.departureTime || review.departureTime}
                  arrivalTime={validated.arrivalTime || review.arrivalTime}
                  fromCode={validated.departureAirportCode || review.departureAirportCode}
                  toCode={validated.arrivalAirportCode || review.arrivalAirportCode}
                  duration={validated.durationFormatted || review.durationFormatted}
                  stopsLabel="Flight"
                />
              </div>
            </div>
          </FlightSoftCard>

          <FlightSoftCard>
            <div className="space-y-3 p-5 md:p-6">
              <p className="text-lg font-bold text-slate-900">Passengers</p>
              {passengers.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-900">
                    {p.ti} {p.fN} {p.lN}
                  </span>
                  <span className="text-xs text-slate-500">{p.pt}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-3 text-sm text-slate-600">
                <p>Email: {customerEmail}</p>
                <p>Mobile: {customerMobile}</p>
              </div>
            </div>
          </FlightSoftCard>

          {testMode ? (
            <FlightSoftCard className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
              <div className="space-y-4 p-5 md:p-6">
                <div className="flex items-center gap-2 text-amber-800">
                  <ShieldCheck className="h-5 w-5" />
                  <p className="font-semibold">Developer testing mode</p>
                </div>
                <p className="text-sm text-amber-900/80">
                  Razorpay is skipped. Simulate payment success to call TripJack Book API, Booking
                  Details, and open the ticket flow.
                </p>
                <p className="rounded-xl bg-white px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
                  NEXT_PUBLIC_TEST_BOOKING=true · Razorpay skipped (set false before real payments)
                </p>
                <Button
                  className={cn(flightPrimaryButtonClass(), "bg-amber-600 hover:bg-amber-700")}
                  disabled={loading || !booking || !onSimulatePaymentSuccess}
                  onClick={onSimulatePaymentSuccess}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Simulating payment & booking...
                    </>
                  ) : (
                    "Simulate Payment Success"
                  )}
                </Button>
                <p className="text-center text-xs text-amber-700">
                  Amount: {formatCurrency(totalFare, locale)} (not charged)
                </p>
              </div>
            </FlightSoftCard>
          ) : (
            <FlightSoftCard className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
              <div className="space-y-4 p-5 md:p-6">
                <div className="flex items-center gap-2 text-[#1a4fa3]">
                  <ShieldCheck className="h-5 w-5" />
                  <p className="font-semibold">We use Razorpay Secure Gateway</p>
                </div>
                <p className="text-sm text-slate-600">
                  Pay with UPI, cards, netbanking, and wallets. Your ticket is issued only after
                  successful payment verification.
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  {["UPI", "Visa", "Mastercard", "RuPay", "Netbanking"].map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <Button
                  className={cn(flightPrimaryButtonClass())}
                  disabled={loading || !booking}
                  onClick={onPay}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing payment...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Now · {formatCurrency(totalFare, locale)}
                    </>
                  )}
                </Button>
                <p className="flex items-center justify-center gap-1 text-center text-xs text-slate-500">
                  <Lock className="h-3.5 w-3.5" />
                  Secured by Razorpay
                </p>
              </div>
            </FlightSoftCard>
          )}
        </div>

        <aside>
          <FlightSoftCard className="sticky top-24">
            <div className="space-y-3 p-5 md:p-6">
              <p className="text-lg font-bold text-slate-900">Amount Payable</p>
              <div className="text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Base fare</span>
                  <span>{formatCurrency(validated.baseFare, locale)}</span>
                </div>
                <div className="mt-1 flex justify-between text-slate-600">
                  <span>Taxes & fees</span>
                  <span>{formatCurrency(validated.taxesAndFees, locale)}</span>
                </div>
                <div className="mt-4 flex justify-between border-t border-slate-100 pt-3 text-xl font-bold text-[#1a4fa3]">
                  <span>Total</span>
                  <span>{formatCurrency(totalFare, locale)}</span>
                </div>
              </div>
              {booking && (
                <p className="text-[10px] text-slate-400">Order ref: {booking.bookingId}</p>
              )}
              <Link
                href="/flights/passengers"
                className="block text-center text-sm font-medium text-[#1a4fa3] hover:underline"
              >
                Edit passengers
              </Link>
            </div>
          </FlightSoftCard>
        </aside>
      </div>
    </div>
  );
}
