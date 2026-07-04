"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plane } from "lucide-react";
import { RequireAuth } from "@/components/auth/require-auth";
import { useFlightBookingApi } from "@/hooks/use-flight-booking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AirlineAvatar, FlightSoftCard } from "@/components/flights/flight-ui";
import type { FlightBookingRecord, FlightBookingStatus } from "@/lib/flights/types";
import { formatCurrency } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

const TABS: Array<{ id: string; label: string; statuses: FlightBookingStatus[] | "all" }> = [
  { id: "all", label: "All", statuses: "all" },
  {
    id: "upcoming",
    label: "Upcoming",
    statuses: [
      "fare_validated",
      "payment_pending",
      "payment_success",
      "booking_pending",
      "confirmed",
      "manual_review_required",
    ],
  },
  { id: "completed", label: "Completed", statuses: ["confirmed"] },
  {
    id: "pending",
    label: "Pending",
    statuses: ["booking_pending", "payment_success", "manual_review_required"],
  },
  {
    id: "cancelled",
    label: "Cancelled",
    statuses: ["payment_failed", "booking_failed"],
  },
];

function statusTone(status: FlightBookingStatus) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-800";
  if (status === "manual_review_required" || status === "booking_pending")
    return "bg-amber-100 text-amber-800";
  if (status === "payment_failed" || status === "booking_failed")
    return "bg-red-100 text-red-800";
  return "bg-blue-100 text-[#1a4fa3]";
}

function FlightBookingsContent() {
  const { locale } = useAppStore();
  const api = useFlightBookingApi();
  const [bookings, setBookings] = useState<FlightBookingRecord[]>([]);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    void api.fetchMyBookings().then((data) => data && setBookings(data));
  }, []);

  const filtered = useMemo(() => {
    const config = TABS.find((t) => t.id === tab);
    if (!config || config.statuses === "all") return bookings;
    return bookings.filter((b) => config.statuses.includes(b.status));
  }, [bookings, tab]);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-gradient-to-r from-[#1a4fa3] to-[#2563c9] text-white">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold md:text-3xl">My Flight Bookings</h1>
          <p className="mt-1 text-sm text-blue-100">
            View tickets, PNR, and payment status for your flights
          </p>
        </div>
      </div>

      <section className="container mx-auto space-y-5 px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/flights"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1a4fa3] px-4 py-2 text-sm font-semibold text-white hover:bg-[#16408a]"
          >
            <Plane className="h-4 w-4" />
            Book a new flight
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <Button
              key={t.id}
              size="sm"
              variant={tab === t.id ? "default" : "outline"}
              className={cn(
                "rounded-full",
                tab === t.id && "bg-[#1a4fa3] hover:bg-[#16408a]"
              )}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {filtered.length === 0 && (
          <FlightSoftCard>
            <div className="py-12 text-center">
              <Plane className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-semibold text-slate-900">No bookings in this category</p>
              <p className="mt-1 text-sm text-slate-500">Search flights to make your first booking.</p>
            </div>
          </FlightSoftCard>
        )}

        {filtered.map((b) => (
          <FlightSoftCard key={b.bookingId}>
            <div className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-start gap-3">
                <AirlineAvatar code={b.airlineCode} />
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {b.sourceCity || b.sourceCode} → {b.destinationCity || b.destinationCode}
                  </p>
                  <p className="text-sm text-slate-600">
                    {b.travelDate} · {b.airlineName} · {b.airlineCode} {b.flightNumber}
                  </p>
                  {(b.pnr || b.tripjackBookingId) && (
                    <p className="mt-1 text-xs text-slate-500">
                      {b.pnr ? `PNR ${b.pnr}` : ""}
                      {b.pnr && b.tripjackBookingId ? " · " : ""}
                      {b.tripjackBookingId ? `ID ${b.tripjackBookingId}` : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <Badge className={`border-0 ${statusTone(b.status)}`}>
                  {b.status.replace(/_/g, " ")}
                </Badge>
                <p className="mt-2 text-lg font-bold text-[#1a4fa3]">
                  {formatCurrency(b.totalFare, locale)}
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Link
                    href={`/flights/ticket/${b.bookingId}`}
                    className="inline-flex h-9 items-center rounded-xl bg-[#1a4fa3] px-4 text-sm font-semibold text-white hover:bg-[#16408a]"
                  >
                    View Ticket
                  </Link>
                  {(b.status === "payment_pending" || b.status === "fare_validated") && (
                    <Link
                      href="/flights/payment"
                      className="inline-flex h-9 items-center rounded-xl border px-4 text-sm font-medium hover:bg-muted"
                    >
                      Pay now
                    </Link>
                  )}
                  <a
                    href="mailto:support@thesafarsathi.com"
                    className="inline-flex h-9 items-center rounded-xl border px-4 text-sm font-medium hover:bg-muted"
                  >
                    Support
                  </a>
                </div>
              </div>
            </div>
          </FlightSoftCard>
        ))}
      </section>
    </div>
  );
}

export default function AccountFlightBookingsPage() {
  return (
    <RequireAuth>
      <FlightBookingsContent />
    </RequireAuth>
  );
}
