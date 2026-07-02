"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { useBusBookingApi } from "@/hooks/use-bus-booking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BusBookingRecord, BusBookingStatus } from "@/lib/seatseller/types";
import { formatCurrency } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

const TABS: Array<{ id: string; label: string; statuses: BusBookingStatus[] }> = [
  { id: "upcoming", label: "Upcoming", statuses: ["seat_blocked", "payment_pending", "payment_success", "confirmed"] },
  { id: "pending", label: "Pending", statuses: ["manual_review_required", "confirmation_failed", "payment_failed"] },
  { id: "completed", label: "Completed", statuses: ["confirmed"] },
  { id: "cancelled", label: "Cancelled", statuses: ["cancelled", "refunded", "refund_pending"] },
];

function BusBookingsContent() {
  const { locale } = useAppStore();
  const api = useBusBookingApi();
  const [bookings, setBookings] = useState<BusBookingRecord[]>([]);
  const [tab, setTab] = useState("upcoming");

  useEffect(() => {
    void api.fetchMyBookings().then((data) => data && setBookings(data));
  }, []);

  const filtered = useMemo(() => {
    const config = TABS.find((t) => t.id === tab);
    if (!config) return bookings;
    return bookings.filter((b) => config.statuses.includes(b.status));
  }, [bookings, tab]);

  const handleCancel = async (booking: BusBookingRecord) => {
    const data = await api.fetchCancellationData(booking.bookingId);
    if (!data) return;
    const ok = window.confirm(
      `Cancel this ticket?\nRefundable: ₹${data.refundableAmount}\nCharges: ₹${data.cancellationCharges}`
    );
    if (!ok) return;
    const updated = await api.cancelBooking(booking.bookingId);
    if (updated) {
      toast.success("Booking cancelled");
      setBookings((list) =>
        list.map((b) => (b.bookingId === updated.bookingId ? updated : b))
      );
    }
  };

  return (
    <>
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold">My Bus Bookings</h1>
          <p className="text-muted-foreground">Manage and cancel your bus tickets</p>
        </div>
      </div>
      <section className="container mx-auto space-y-4 px-4 py-8">
        <Link href="/bus/search" className="inline-flex text-sm text-primary hover:underline">
          Book a new bus
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
                  {b.sourceCityName} → {b.destinationCityName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {b.doj} · {b.operatorName} · Seats {b.seatNames.join(", ")}
                </p>
                {b.tin && (
                  <p className="text-xs text-muted-foreground">
                    TIN {b.tin} · PNR {b.pnr}
                  </p>
                )}
              </div>
              <div className="text-right">
                <Badge>{b.status.replace(/_/g, " ")}</Badge>
                <p className="mt-1 font-bold">{formatCurrency(b.totalFare, locale)}</p>
                <div className="mt-2 flex flex-wrap justify-end gap-2">
                  <Link
                    href={`/bus/ticket/${b.bookingId}`}
                    className="inline-flex h-8 items-center rounded-md border px-3 text-sm hover:bg-muted"
                  >
                    View ticket
                  </Link>
                  {(b.status === "payment_pending" || b.status === "seat_blocked") && (
                    <Link
                      href={`/bus/payment?bookingId=${b.bookingId}`}
                      className="inline-flex h-8 items-center rounded-md bg-[#1a4fa3] px-3 text-sm text-white hover:bg-[#163f85]"
                    >
                      Pay now
                    </Link>
                  )}
                  {b.status === "confirmed" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => void handleCancel(b)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

export default function AccountBusBookingsPage() {
  return (
    <RequireAuth>
      <BusBookingsContent />
    </RequireAuth>
  );
}
