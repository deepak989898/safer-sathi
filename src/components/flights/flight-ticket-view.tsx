"use client";

import Link from "next/link";
import { Download, Loader2, Printer, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AirlineLogo } from "@/components/flights/airline-logo";
import { GuestLoginDetailsCard } from "@/components/flights/guest-login-details-card";
import { FlightRouteStrip, FlightSoftCard, FlightStepBar } from "@/components/flights/flight-ui";
import {
  getCustomerTicketDisplayStatus,
  TICKET_STATUS_BANNER,
} from "@/lib/flights/booking-status-display";
import type { FlightBookingRecord } from "@/lib/flights/types";
import { formatCurrency } from "@/lib/i18n";
import { openFlightTicketPrintWindow } from "@/lib/flights/flight-ticket-print";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

interface FlightTicketViewProps {
  booking: FlightBookingRecord;
  locale: Locale;
  showDebug?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

function passengerStatusLabel(
  booking: FlightBookingRecord,
  pStatus?: string
): string {
  const display = getCustomerTicketDisplayStatus(booking);
  if (pStatus?.toUpperCase() === "CONFIRMED" || pStatus?.toUpperCase() === "SUCCESS") {
    return "Confirmed";
  }
  if (display === "confirmed") return "Confirmed";
  if (display === "processing") return "Processing";
  if (display === "failed") return "Failed";
  return pStatus || "—";
}

function formatGstInfo(gst: Record<string, unknown>): string | null {
  const gstin = gst.gstin ?? gst.GSTIN ?? gst.gstNumber;
  const name = gst.gstName ?? gst.name ?? gst.registeredName;
  const parts = [
    name ? `Name: ${name}` : null,
    gstin ? `GSTIN: ${gstin}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function FlightTicketView({
  booking,
  locale,
  showDebug = false,
  refreshing = false,
  onRefresh,
}: FlightTicketViewProps) {
  const details = booking.bookingDetailNormalized ?? booking.normalizedBookingDetails;
  const segments =
    details?.flightSegments?.length
      ? details.flightSegments
      : booking.fareValidateNormalized?.segments ?? booking.reviewNormalized?.segments ?? [];

  const pnr = booking.pnr || details?.pnr || "";
  const airlinePnr = booking.airlinePnr || details?.airlinePnr || "";
  const ticketNumber = booking.ticketNumber || booking.ticketNo || details?.ticketNumber || "";
  const displayStatus = getCustomerTicketDisplayStatus(booking);
  const banner = TICKET_STATUS_BANNER[displayStatus];
  const passengerFares = details?.passengerFares ?? [];
  const gstSummary = details?.gstInfo ? formatGstInfo(details.gstInfo) : null;

  const handlePrint = () => openFlightTicketPrintWindow(booking, locale);
  const handleDownload = () => openFlightTicketPrintWindow(booking, locale);

  const handleShare = async () => {
    const text = `Safar Sathi Flight Booking ${booking.bookingId}${pnr ? ` · PNR ${pnr}` : ""}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Flight Ticket", text, url: window.location.href });
        return;
      } catch {
        // fall through
      }
    }
    await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
  };

  return (
    <div className="space-y-5">
      <FlightSoftCard className={cn("border print:hidden", banner.className)}>
        <div className="flex flex-wrap items-start justify-between gap-3 p-4 md:p-5">
          <div>
            <p className="text-base font-semibold">{banner.title}</p>
            <p className="mt-1 text-sm opacity-90">{banner.description}</p>
          </div>
          {(displayStatus === "processing" || displayStatus === "cancellation_requested") &&
            onRefresh && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 rounded-lg border-amber-300 bg-white/80"
              onClick={onRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh status
            </Button>
            )}
        </div>
      </FlightSoftCard>

      <FlightSoftCard className="overflow-hidden print:shadow-none" id="flight-ticket-print">
        <div className="bg-gradient-to-br from-[#1a4fa3] via-[#1e56b0] to-[#2563c9] px-5 py-5 text-white md:px-6 md:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <AirlineLogo
                code={booking.airlineCode}
                name={booking.airlineName}
                size={48}
                className="rounded-xl bg-white/95 p-1"
              />
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-blue-100">
                  Safar Sathi · E-Ticket
                </p>
                <h1 className="text-xl font-bold md:text-2xl">{booking.airlineName}</h1>
                <p className="mt-0.5 text-sm text-blue-100">
                  {booking.airlineCode} {booking.flightNumber} · {booking.travelDate}
                </p>
              </div>
            </div>
            <Badge
              className={cn(
                "border-0 text-xs font-semibold uppercase tracking-wide",
                displayStatus === "confirmed" && "bg-emerald-500 text-white",
                displayStatus === "processing" && "bg-amber-400 text-amber-950",
                displayStatus === "failed" && "bg-red-500 text-white",
                displayStatus === "cancellation_requested" && "bg-orange-500 text-white",
                displayStatus === "cancelled" && "bg-slate-500 text-white",
                displayStatus === "other" && "bg-white/20 text-white"
              )}
            >
              {banner.title}
            </Badge>
          </div>
        </div>

        <div className="space-y-6 p-5 md:p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InfoCell label="Booking ID" value={booking.bookingId} mono />
            {pnr ? (
              <InfoCell label="PNR" value={pnr} mono highlight />
            ) : displayStatus === "processing" ? (
              <InfoCell label="PNR" value="Pending" muted />
            ) : null}
            {airlinePnr ? <InfoCell label="Airline PNR" value={airlinePnr} mono /> : null}
            {ticketNumber ? (
              <InfoCell label="Ticket number" value={ticketNumber} mono />
            ) : displayStatus === "processing" ? (
              <InfoCell label="Ticket" value="Pending" muted />
            ) : null}
            <InfoCell label="Payment" value={booking.paymentStatus} capitalize />
            <InfoCell
              label="Booking status"
              value={booking.bookingStatus?.replace(/_/g, " ") ?? booking.status.replace(/_/g, " ")}
              capitalize
            />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 md:p-5">
            <FlightRouteStrip
              departureTime={booking.departureTime}
              arrivalTime={booking.arrivalTime}
              fromCode={booking.sourceCode}
              toCode={booking.destinationCode}
              fromCity={booking.sourceCity}
              toCity={booking.destinationCity}
              duration={booking.durationFormatted}
              stopsLabel="Flight"
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-900">Passengers</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5">Passenger</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">PNR / Ticket</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(details?.passengers?.length
                    ? details.passengers
                    : booking.passengers.map((p) => ({
                        name: `${p.ti} ${p.fN} ${p.lN}`,
                        type: p.pt,
                        ticketNumber: ticketNumber || undefined,
                        pnr: pnr || undefined,
                        status: undefined,
                      }))
                  ).map((p, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                      <td className="px-4 py-3 text-slate-600">{p.type}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-800">
                        {p.ticketNumber || p.pnr || ticketNumber || pnr || (
                          <span className="text-amber-600">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            passengerStatusLabel(booking, p.status) === "Confirmed" &&
                              "bg-emerald-100 text-emerald-800",
                            passengerStatusLabel(booking, p.status) === "Processing" &&
                              "bg-amber-100 text-amber-800",
                            passengerStatusLabel(booking, p.status) === "Failed" &&
                              "bg-red-100 text-red-800"
                          )}
                        >
                          {passengerStatusLabel(booking, p.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {passengerFares.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Fare breakdown</p>
              <div className="space-y-2">
                {passengerFares.map((fare, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2.5 text-sm"
                  >
                    <span className="font-medium text-slate-800">
                      {fare.name} · {fare.type}
                    </span>
                    <span className="font-semibold text-[#1a4fa3]">
                      {formatCurrency(fare.totalFare, locale)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gstSummary && (
            <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-medium text-slate-900">GST: </span>
              {gstSummary}
            </p>
          )}

          {segments.length > 1 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-900">Flight segments</p>
              <div className="space-y-2">
                {segments.map((seg, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm"
                  >
                    <p className="font-medium text-slate-900">
                      {seg.airlineCode} {seg.flightNumber} · {seg.departureAirportCode} →{" "}
                      {seg.arrivalAirportCode}
                    </p>
                    <p className="text-slate-600">
                      {seg.departureTime} – {seg.arrivalTime}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4 md:grid-cols-2 md:p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total fare paid</p>
              <p className="mt-1 text-2xl font-bold text-[#1a4fa3]">
                {formatCurrency(booking.totalFare, locale)}
              </p>
            </div>
            {booking.refundStatus && booking.refundStatus !== "none" && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Refund</p>
                <p className="mt-1 font-semibold capitalize text-slate-800">
                  {booking.refundStatus.replace(/_/g, " ")}
                  {typeof booking.refundAmount === "number" && booking.refundAmount > 0
                    ? ` · ${formatCurrency(booking.refundAmount, locale)}`
                    : ""}
                </p>
              </div>
            )}
          </div>

          <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Support:{" "}
            <a href="mailto:support@thesafarsathi.com" className="font-medium text-[#1a4fa3] hover:underline">
              support@thesafarsathi.com
            </a>{" "}
            · +91 8354075026
          </p>
        </div>
      </FlightSoftCard>

      {booking.guestAccountProvisioned && (
        <GuestLoginDetailsCard booking={booking} className="print:hidden" />
      )}

      <div className="flex flex-wrap justify-center gap-2 print:hidden sm:gap-3">
        <Button variant="outline" className="min-w-[120px] flex-1 rounded-xl sm:flex-none" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" className="min-w-[120px] flex-1 rounded-xl sm:flex-none" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          PDF
        </Button>
        <Button
          variant="outline"
          className="min-w-[120px] flex-1 rounded-xl sm:flex-none"
          onClick={() => void handleShare()}
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        {booking.paymentStatus === "paid" && (
          <a
            href={`/api/flights/bookings/${booking.bookingId}/invoice`}
            className="inline-flex h-10 min-w-[120px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50 sm:flex-none"
            target="_blank"
            rel="noreferrer"
          >
            Invoice
          </a>
        )}
        <Link
          href="/account/flight-bookings"
          className="inline-flex h-10 min-w-[120px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium hover:bg-slate-50 sm:flex-none"
        >
          My bookings
        </Link>
      </div>

      <div className="print:hidden">
        <FlightStepBar current="ticket" />
      </div>

      {showDebug && details?.gstInfo && Object.keys(details.gstInfo).length > 0 && (
        <details className="print:hidden">
          <summary className="cursor-pointer text-xs font-medium text-slate-500">
            Admin: raw GST / debug data
          </summary>
          <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 text-[10px] text-slate-100">
            {JSON.stringify(details.gstInfo, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function InfoCell({
  label,
  value,
  mono,
  highlight,
  muted,
  capitalize: cap,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  muted?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm font-semibold",
          mono && "font-mono",
          highlight && "text-lg text-[#1a4fa3]",
          muted && "text-amber-600",
          cap && "capitalize",
          !highlight && !muted && "text-slate-900"
        )}
      >
        {value}
      </p>
    </div>
  );
}
