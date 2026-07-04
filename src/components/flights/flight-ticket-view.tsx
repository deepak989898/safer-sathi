"use client";

import Link from "next/link";
import { Download, Printer, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AirlineAvatar,
  FlightRouteStrip,
  FlightSoftCard,
  FlightStepBar,
  FlightSuccessPanel,
} from "@/components/flights/flight-ui";
import type { FlightBookingRecord } from "@/lib/flights/types";
import { formatCurrency } from "@/lib/i18n";
import type { Locale } from "@/types";

interface FlightTicketViewProps {
  booking: FlightBookingRecord;
  locale: Locale;
}

function statusLabel(status: FlightBookingRecord["status"]): string {
  return status.replace(/_/g, " ");
}

function statusTone(status: FlightBookingRecord["status"]) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "manual_review_required" || status === "booking_pending")
    return "bg-amber-100 text-amber-800";
  if (status === "payment_failed" || status === "booking_failed")
    return "bg-red-100 text-red-800";
  return "bg-blue-100 text-[#1a4fa3]";
}

export function FlightTicketView({ booking, locale }: FlightTicketViewProps) {
  const details = booking.normalizedBookingDetails;
  const segments =
    details?.flightSegments?.length
      ? details.flightSegments
      : booking.fareValidateNormalized?.segments ?? booking.reviewNormalized?.segments ?? [];

  const pnr = booking.pnr || details?.pnr || "";
  const airlinePnr = booking.airlinePnr || details?.airlinePnr || "";
  const ticketNumber = booking.ticketNumber || details?.ticketNumber || "";

  const handlePrint = () => window.print();
  const handleDownload = () => {
    const html = document.getElementById("flight-ticket-print");
    if (!html) return handlePrint();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Flight Ticket ${booking.bookingId}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;max-width:720px;margin:0 auto}
      h1{font-size:20px} table{width:100%;border-collapse:collapse;margin-top:16px}
      td,th{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}</style></head><body>`);
    w.document.write(html.innerHTML);
    w.document.write("</body></html>");
    w.document.close();
    w.print();
  };

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
    <div className="space-y-6">
      <FlightStepBar current="ticket" />

      {booking.status === "confirmed" && (
        <FlightSuccessPanel
          title="Booking Confirmed!"
          description="Your flight is booked. Save or print your e-ticket below."
        >
          <div className="mt-4 grid gap-2 text-left text-sm">
            <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-slate-500">Booking ID</span>
              <span className="font-mono font-semibold">{booking.bookingId}</span>
            </div>
            {pnr && (
              <div className="flex justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">PNR</span>
                <span className="font-mono font-semibold">{pnr}</span>
              </div>
            )}
          </div>
        </FlightSuccessPanel>
      )}

      {booking.paymentStatus === "paid" && booking.status === "manual_review_required" && (
        <FlightSuccessPanel
          title="Payment Successful!"
          description="Payment received. Ticket confirmation is pending. Our team will verify and update shortly."
          tone="warning"
        >
          {booking.razorpayPaymentId && (
            <p className="mt-4 text-xs text-slate-500">
              Payment ID: <span className="font-mono">{booking.razorpayPaymentId}</span>
            </p>
          )}
        </FlightSuccessPanel>
      )}

      <FlightSoftCard
        className="overflow-hidden print:shadow-none"
        id="flight-ticket-print"
      >
        <div className="bg-gradient-to-r from-[#1a4fa3] to-[#2563c9] px-6 py-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-100">Safar Sathi</p>
              <h1 className="text-xl font-bold md:text-2xl">E-Ticket / Itinerary</h1>
            </div>
            <Badge className={`border-0 ${statusTone(booking.status)}`}>
              {statusLabel(booking.status)}
            </Badge>
          </div>
        </div>

        <div className="space-y-6 p-5 md:p-6">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <p>
              <span className="text-slate-500">Booking ID</span>
              <br />
              <strong className="font-mono">{booking.bookingId}</strong>
            </p>
            {booking.tripjackBookingId && (
              <p>
                <span className="text-slate-500">TripJack ID</span>
                <br />
                <strong className="font-mono">{booking.tripjackBookingId}</strong>
              </p>
            )}
            {pnr && (
              <p>
                <span className="text-slate-500">PNR</span>
                <br />
                <strong className="font-mono text-lg text-[#1a4fa3]">{pnr}</strong>
              </p>
            )}
            {airlinePnr && (
              <p>
                <span className="text-slate-500">Airline PNR</span>
                <br />
                <strong className="font-mono">{airlinePnr}</strong>
              </p>
            )}
            {ticketNumber && (
              <p>
                <span className="text-slate-500">Ticket number</span>
                <br />
                <strong className="font-mono">{ticketNumber}</strong>
              </p>
            )}
            <p>
              <span className="text-slate-500">Travel date</span>
              <br />
              <strong>{booking.travelDate}</strong>
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="mb-4 flex items-center gap-3">
              <AirlineAvatar code={booking.airlineCode} />
              <div>
                <p className="font-semibold text-slate-900">{booking.airlineName}</p>
                <p className="text-sm text-slate-500">
                  {booking.airlineCode} {booking.flightNumber}
                </p>
              </div>
            </div>
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
            <p className="mb-2 font-semibold text-slate-900">Passengers</p>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Passenger</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Ticket No</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.passengers.map((p, i) => {
                    const detailPax = details?.passengers?.[i];
                    return (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium">
                          {p.ti} {p.fN} {p.lN}
                        </td>
                        <td className="px-3 py-2">{p.pt}</td>
                        <td className="px-3 py-2 font-mono text-xs">
                          {detailPax?.ticketNumber || ticketNumber || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {segments.length > 0 && (
            <div>
              <p className="mb-2 font-semibold text-slate-900">Flight segments</p>
              <div className="space-y-2">
                {segments.map((seg, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">
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

          <div className="grid gap-3 rounded-2xl bg-blue-50/60 p-4 text-sm md:grid-cols-2">
            <p>
              <span className="text-slate-500">Fare paid</span>
              <br />
              <strong className="text-lg text-[#1a4fa3]">
                {formatCurrency(booking.totalFare, locale)}
              </strong>
            </p>
            <p>
              <span className="text-slate-500">Payment status</span>
              <br />
              <strong className="capitalize">{booking.paymentStatus}</strong>
            </p>
            {booking.razorpayPaymentId && (
              <p className="md:col-span-2">
                <span className="text-slate-500">Razorpay payment ID</span>
                <br />
                <strong className="font-mono text-xs">{booking.razorpayPaymentId}</strong>
              </p>
            )}
          </div>

          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            Support:{" "}
            <a href="mailto:support@thesafarsathi.com" className="text-[#1a4fa3] hover:underline">
              support@thesafarsathi.com
            </a>{" "}
            · +91 8354075026
          </p>
        </div>
      </FlightSoftCard>

      <div className="flex flex-wrap justify-center gap-3 print:hidden">
        <Button variant="outline" className="rounded-xl" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" className="rounded-xl" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button variant="outline" className="rounded-xl" onClick={() => void handleShare()}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Link
          href="/account/flight-bookings"
          className="inline-flex h-10 items-center rounded-xl border px-4 text-sm font-medium hover:bg-muted"
        >
          My flight bookings
        </Link>
      </div>
    </div>
  );
}
