"use client";

import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function FlightTicketView({ booking, locale }: FlightTicketViewProps) {
  const details = booking.normalizedBookingDetails;
  const segments =
    details?.flightSegments?.length
      ? details.flightSegments
      : booking.fareValidateNormalized?.segments ?? booking.reviewNormalized?.segments ?? [];

  const pnr = booking.pnr || details?.pnr || "";
  const airlinePnr = booking.airlinePnr || details?.airlinePnr || "";
  const ticketNumber = booking.ticketNumber || details?.ticketNumber || "";

  const isConfirmed =
    booking.status === "confirmed" ||
    booking.status === "booking_pending" ||
    booking.status === "manual_review_required";

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

  return (
    <div className="space-y-6">
      <Card
        className="overflow-hidden rounded-2xl border-slate-200 shadow-md print:shadow-none"
        id="flight-ticket-print"
      >
        <div className="bg-[#1a4fa3] px-6 py-4 text-white print:bg-[#1a4fa3]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-100">Safar Sathi</p>
              <h1 className="text-xl font-bold">Flight E-Ticket</h1>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-white">
              {statusLabel(booking.status)}
            </Badge>
          </div>
        </div>

        <CardContent className="space-y-6 pt-6">
          {booking.status === "manual_review_required" && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Payment received. Ticket confirmation is pending. Our team will verify and update
              shortly.
            </p>
          )}

          {isConfirmed && !ticketNumber && booking.status !== "manual_review_required" && (
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
              Booking confirmed. Ticket details will be updated shortly.
            </p>
          )}

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
                <strong className="font-mono">{pnr}</strong>
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
              <span className="text-slate-500">Route</span>
              <br />
              <strong>
                {booking.sourceCity || booking.sourceCode} →{" "}
                {booking.destinationCity || booking.destinationCode}
              </strong>
            </p>
            <p>
              <span className="text-slate-500">Travel date</span>
              <br />
              <strong>{booking.travelDate}</strong>
            </p>
            <p>
              <span className="text-slate-500">Airline</span>
              <br />
              <strong>
                {booking.airlineName} · {booking.airlineCode} {booking.flightNumber}
              </strong>
            </p>
            <p>
              <span className="text-slate-500">Departure – Arrival</span>
              <br />
              <strong>
                {booking.departureTime} – {booking.arrivalTime} · {booking.durationFormatted}
              </strong>
            </p>
            <p>
              <span className="text-slate-500">Payment status</span>
              <br />
              <strong className="capitalize">{booking.paymentStatus}</strong>
            </p>
            <p>
              <span className="text-slate-500">Fare paid</span>
              <br />
              <strong>{formatCurrency(booking.totalFare, locale)}</strong>
            </p>
            {booking.razorpayPaymentId && (
              <p>
                <span className="text-slate-500">Razorpay payment ID</span>
                <br />
                <strong className="font-mono text-xs">{booking.razorpayPaymentId}</strong>
              </p>
            )}
            {booking.razorpayOrderId && (
              <p>
                <span className="text-slate-500">Razorpay order ID</span>
                <br />
                <strong className="font-mono text-xs">{booking.razorpayOrderId}</strong>
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 font-semibold text-slate-900">Passengers</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-slate-500">
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2">Ticket</th>
                </tr>
              </thead>
              <tbody>
                {booking.passengers.map((p, i) => {
                  const detailPax = details?.passengers?.[i];
                  return (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="py-2 pr-2">
                        {p.ti} {p.fN} {p.lN}
                      </td>
                      <td className="py-2 pr-2">{p.pt}</td>
                      <td className="py-2 font-mono text-xs">
                        {detailPax?.ticketNumber || ticketNumber || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {segments.length > 0 && (
            <div>
              <p className="mb-2 font-semibold text-slate-900">Flight segments</p>
              <div className="space-y-2">
                {segments.map((seg, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-medium">
                      {seg.airlineCode} {seg.flightNumber} · {seg.departureAirportCode} →{" "}
                      {seg.arrivalAirportCode}
                    </p>
                    <p className="text-slate-600">
                      {seg.departureTime} – {seg.arrivalTime}
                      {seg.departureTerminal ? ` · T${seg.departureTerminal}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            For support, contact{" "}
            <a href="mailto:support@thesafarsathi.com" className="text-[#1a4fa3] hover:underline">
              support@thesafarsathi.com
            </a>{" "}
            or call +91 8354075026 with your booking ID.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-3 print:hidden">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Link
          href="/account/flight-bookings"
          className="inline-flex h-10 items-center rounded-md border px-4 text-sm hover:bg-muted"
        >
          My flight bookings
        </Link>
      </div>
    </div>
  );
}
