"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { useFlightBookingApi } from "@/hooks/use-flight-booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FlightBookingRecord, FlightBookingStatus } from "@/lib/flights/types";
import { formatCurrency } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";

const TABS: Array<{ id: string; label: string; statuses: FlightBookingStatus[] }> = [
  {
    id: "upcoming",
    label: "Upcoming",
    statuses: ["fare_validated", "payment_pending", "payment_success", "booking_pending", "confirmed"],
  },
  {
    id: "confirmed",
    label: "Confirmed",
    statuses: ["confirmed"],
  },
  {
    id: "pending",
    label: "Pending",
    statuses: ["booking_pending", "payment_success", "manual_review_required"],
  },
  {
    id: "failed",
    label: "Failed",
    statuses: ["payment_failed", "booking_failed"],
  },
  {
    id: "manual",
    label: "Manual Review",
    statuses: ["manual_review_required"],
  },
];

function FlightBookingsContent() {
  const { locale } = useAppStore();
  const api = useFlightBookingApi();
  const [bookings, setBookings] = useState<FlightBookingRecord[]>([]);
  const [tab, setTab] = useState("upcoming");

  useEffect(() => {
    void api.fetchMyBookings().then((data) => data && setBookings(data));
  }, []);

  const filtered = useMemo(() => {
    const config = TABS.find((t) => t.id === tab);
    if (!config) return bookings;
    return bookings.filter((b) => config.statuses.includes(b.status));
  }, [bookings, tab]);

  return (
    <>
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">My Flight Bookings</h1>
          <p className="text-muted-foreground">View and download your flight tickets</p>
        </div>
      </div>
      <section className="container mx-auto space-y-4 px-4 py-8">
        <Link href="/flights" className="inline-flex text-sm text-primary hover:underline">
          Book a new flight
        </Link>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "default" : "outline"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No bookings in this category.
            </CardContent>
          </Card>
        )}

        {filtered.map((b) => (
          <Card key={b.bookingId}>
            <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
              <div>
                <p className="font-semibold">
                  {b.sourceCity || b.sourceCode} → {b.destinationCity || b.destinationCode}
                </p>
                <p className="text-sm text-muted-foreground">
                  {b.travelDate} · {b.airlineName} · {b.airlineCode} {b.flightNumber}
                </p>
                {(b.pnr || b.tripjackBookingId) && (
                  <p className="text-xs text-muted-foreground">
                    {b.pnr ? `PNR ${b.pnr}` : ""}
                    {b.pnr && b.tripjackBookingId ? " · " : ""}
                    {b.tripjackBookingId ? `ID ${b.tripjackBookingId}` : ""}
                  </p>
                )}
              </div>
              <div className="text-right">
                <Badge>{b.status.replace(/_/g, " ")}</Badge>
                <p className="mt-1 font-bold">{formatCurrency(b.totalFare, locale)}</p>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <Link
                    href={`/flights/ticket/${b.bookingId}`}
                    className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
                  >
                    View ticket
                  </Link>
                  {(b.status === "payment_pending" || b.status === "fare_validated") && (
                    <Link
                      href="/flights/payment"
                      className="inline-flex h-8 items-center rounded-md bg-[#1a4fa3] px-3 text-sm text-white hover:bg-[#163f85]"
                    >
                      Pay now
                    </Link>
                  )}
                  <a
                    href="mailto:support@thesafarsathi.com"
                    className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
                  >
                    Contact support
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

export default function AccountFlightBookingsPage() {
  return (
    <RequireAuth>
      <FlightBookingsContent />
    </RequireAuth>
  );
}
