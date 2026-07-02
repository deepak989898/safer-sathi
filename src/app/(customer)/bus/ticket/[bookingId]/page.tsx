"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BusBookingRecord } from "@/lib/seatseller/types";
import { formatCurrency } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";

export default function BusTicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { locale } = useAppStore();
  const [booking, setBooking] = useState<BusBookingRecord | null>(null);
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    void params.then(async ({ bookingId: id }) => {
      setBookingId(id);
      const res = await fetch(`/api/bus/bookings/${id}`);
      const json = await res.json();
      if (json.success) setBooking(json.data.booking);
    });
  }, [params]);

  if (!booking) {
    return (
      <section className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Loading ticket…
      </section>
    );
  }

  return (
    <section className="container mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold">Bus Ticket</h1>
            <Badge
              variant={
                booking.status === "confirmed"
                  ? "default"
                  : booking.status === "manual_review_required"
                    ? "secondary"
                    : "outline"
              }
            >
              {booking.status.replace(/_/g, " ")}
            </Badge>
          </div>

          {booking.status === "manual_review_required" && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Payment received. Ticket confirmation is pending. Our team will verify and update
              shortly.
            </p>
          )}

          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Route:</span> {booking.sourceCityName} →{" "}
              {booking.destinationCityName}
            </p>
            <p>
              <span className="text-muted-foreground">Date:</span> {booking.doj}
            </p>
            <p>
              <span className="text-muted-foreground">Operator:</span> {booking.operatorName}
            </p>
            <p>
              <span className="text-muted-foreground">Bus:</span> {booking.busType}
            </p>
            <p>
              <span className="text-muted-foreground">Seats:</span> {booking.seatNames.join(", ")}
            </p>
            <p>
              <span className="text-muted-foreground">Fare:</span>{" "}
              {formatCurrency(booking.totalFare, locale)}
            </p>
            {booking.tin && (
              <p>
                <span className="text-muted-foreground">TIN:</span> {booking.tin}
              </p>
            )}
            {booking.pnr && (
              <p>
                <span className="text-muted-foreground">PNR:</span> {booking.pnr}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Boarding:</span>{" "}
              {booking.boardingPoint.time} — {booking.boardingPoint.location}
            </p>
            <p>
              <span className="text-muted-foreground">Dropping:</span>{" "}
              {booking.droppingPoint.time} — {booking.droppingPoint.location}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Link
              href="/account/bus-bookings"
              className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
            >
              <Download className="mr-2 h-4 w-4" />
              My bus bookings
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
