"use client";

import Link from "next/link";
import { Download, Printer, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BusBookingRecord } from "@/lib/seatseller/types";
import { formatCurrency } from "@/lib/i18n";
import type { Locale } from "@/types";

interface BusTicketViewProps {
  booking: BusBookingRecord;
  locale: Locale;
  onCancel?: () => void;
  showCancel?: boolean;
}

function qrUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(data)}`;
}

export function BusTicketView({ booking, locale, onCancel, showCancel }: BusTicketViewProps) {
  const qrData = booking.tin
    ? `TIN:${booking.tin}|PNR:${booking.pnr ?? ""}|ID:${booking.bookingId}`
    : booking.bookingId;

  const handlePrint = () => window.print();
  const handleDownload = () => {
    const html = document.getElementById("bus-ticket-print");
    if (!html) return handlePrint();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Bus Ticket ${booking.bookingId}</title>
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
      <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-md print:shadow-none" id="bus-ticket-print">
        <div className="bg-[#1a4fa3] px-6 py-4 text-white print:bg-[#1a4fa3]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-100">Safar Sathi</p>
              <h1 className="text-xl font-bold">Bus E-Ticket</h1>
            </div>
            <Badge
              variant="secondary"
              className="bg-white/20 text-white"
            >
              {booking.status.replace(/_/g, " ")}
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

          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="grid flex-1 gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="text-slate-500">Route</span>
                <br />
                <strong>
                  {booking.sourceCityName} → {booking.destinationCityName}
                </strong>
              </p>
              <p>
                <span className="text-slate-500">Journey date</span>
                <br />
                <strong>{booking.doj}</strong>
              </p>
              <p>
                <span className="text-slate-500">Operator</span>
                <br />
                <strong>{booking.operatorName}</strong>
              </p>
              <p>
                <span className="text-slate-500">Bus type</span>
                <br />
                <strong>{booking.busType}</strong>
              </p>
              {booking.tin && (
                <p>
                  <span className="text-slate-500">TIN</span>
                  <br />
                  <strong className="font-mono">{booking.tin}</strong>
                </p>
              )}
              {booking.pnr && (
                <p>
                  <span className="text-slate-500">PNR</span>
                  <br />
                  <strong className="font-mono">{booking.pnr}</strong>
                </p>
              )}
              {booking.operatorPnr && (
                <p>
                  <span className="text-slate-500">Operator PNR</span>
                  <br />
                  <strong className="font-mono">{booking.operatorPnr}</strong>
                </p>
              )}
              <p>
                <span className="text-slate-500">Boarding</span>
                <br />
                <strong>
                  {booking.boardingPoint.time} — {booking.boardingPoint.location}
                </strong>
              </p>
              <p>
                <span className="text-slate-500">Dropping</span>
                <br />
                <strong>
                  {booking.droppingPoint.time} — {booking.droppingPoint.location}
                </strong>
              </p>
              <p>
                <span className="text-slate-500">Contact</span>
                <br />
                <strong>{booking.customerMobile}</strong>
              </p>
              <p>
                <span className="text-slate-500">Total fare</span>
                <br />
                <strong className="text-[#1a4fa3]">
                  {formatCurrency(booking.totalFare, locale)}
                </strong>
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <QrCode className="h-4 w-4 text-slate-400" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl(qrData)}
                alt="Ticket QR code"
                width={140}
                height={140}
                className="rounded-md"
              />
              <p className="text-center text-[10px] text-slate-500">Scan at boarding</p>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Passengers & seats</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Seat</th>
                    <th className="px-3 py-2">Gender</th>
                    <th className="px-3 py-2">Fare</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.passengerDetails.map((p) => (
                    <tr key={p.seatName} className="border-t border-slate-100">
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2 font-medium">{p.seatName}</td>
                      <td className="px-3 py-2">{p.gender}</td>
                      <td className="px-3 py-2">{formatCurrency(p.fare, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {booking.cancellationPolicy && (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <p className="mb-1 font-semibold text-slate-800">Cancellation policy</p>
              <p>{booking.cancellationPolicy}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print ticket
        </Button>
        <Button variant="outline" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download / PDF
        </Button>
        <Link
          href="/account/bus-bookings"
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm hover:bg-muted"
        >
          My bus bookings
        </Link>
        {showCancel && booking.status === "confirmed" && onCancel && (
          <Button variant="destructive" onClick={onCancel}>
            Cancel ticket
          </Button>
        )}
      </div>
    </div>
  );
}
