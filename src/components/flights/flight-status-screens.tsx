"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FlightSoftCard,
  FlightStepBar,
  FlightSuccessPanel,
  flightPrimaryButtonClass,
} from "@/components/flights/flight-ui";
import { formatCurrency } from "@/lib/i18n";
import type { FlightBookingRecord } from "@/lib/flights/types";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

interface PaymentSuccessScreenProps {
  booking: FlightBookingRecord;
  locale: Locale;
  onContinue: () => void;
}

/** Reference screen 08 — Payment Successful */
export function FlightPaymentSuccessScreen({
  booking,
  locale,
  onContinue,
}: PaymentSuccessScreenProps) {
  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <FlightStepBar current="payment" />
      <div className="container mx-auto px-4 py-10 md:py-16">
        <FlightSuccessPanel
          title="Payment Successful!"
          description="Your payment was received securely via Razorpay."
        >
          <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4 text-left text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Payment ID</span>
              <span className="break-all text-right font-mono font-semibold text-slate-900">
                {booking.razorpayPaymentId || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Amount paid</span>
              <span className="text-lg font-bold text-[#1a4fa3]">
                {formatCurrency(booking.totalFare, locale)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Order ID</span>
              <span className="break-all text-right font-mono text-xs text-slate-700">
                {booking.razorpayOrderId || booking.bookingId}
              </span>
            </div>
          </div>
          <Button className={cn(flightPrimaryButtonClass(), "mt-6")} onClick={onContinue}>
            View Booking Status
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </FlightSuccessPanel>
      </div>
    </div>
  );
}

interface BookingConfirmationScreenProps {
  booking: FlightBookingRecord;
  locale: Locale;
  onViewTicket: () => void;
}

/** Reference screen 09 — Booking Confirmed / pending */
export function FlightBookingConfirmationScreen({
  booking,
  locale,
  onViewTicket,
}: BookingConfirmationScreenProps) {
  const confirmed = booking.status === "confirmed";
  const pending =
    booking.status === "manual_review_required" ||
    booking.status === "booking_pending" ||
    booking.status === "payment_received_booking_failed" ||
    booking.status === "payment_success";

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <FlightStepBar current="ticket" />
      <div className="container mx-auto px-4 py-10 md:py-16">
        <FlightSuccessPanel
          title={confirmed ? "Booking Confirmed!" : "Booking In Progress"}
          description={
            pending
              ? "Payment received. Ticket confirmation is pending. Our team will process shortly."
              : "Your flight is booked. View your e-ticket and itinerary."
          }
          tone={pending ? "warning" : "success"}
        >
          <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4 text-left text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Booking ID</span>
              <span className="break-all text-right font-mono font-semibold">
                {booking.bookingId}
              </span>
            </div>
            {booking.pnr && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">PNR</span>
                <span className="font-mono text-lg font-bold text-[#1a4fa3]">{booking.pnr}</span>
              </div>
            )}
            {booking.airlinePnr && (
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">Airline PNR</span>
                <span className="font-mono font-semibold">{booking.airlinePnr}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Route</span>
              <span className="font-semibold">
                {booking.sourceCode} → {booking.destinationCode}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Fare paid</span>
              <span className="font-bold text-[#1a4fa3]">
                {formatCurrency(booking.totalFare, locale)}
              </span>
            </div>
          </div>
          <Button className={cn(flightPrimaryButtonClass(), "mt-6")} onClick={onViewTicket}>
            View Ticket / Itinerary
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </FlightSuccessPanel>

        <FlightSoftCard className="mx-auto mt-6 max-w-lg">
          <div className="p-4 text-center text-xs text-slate-500">
            A confirmation email will be sent to{" "}
            <span className="font-medium text-slate-700">{booking.customerEmail}</span> when
            ticket details are ready.
          </div>
        </FlightSoftCard>
      </div>
    </div>
  );
}
