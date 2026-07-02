"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBusBookingApi } from "@/hooks/use-bus-booking";
import { BusTicketView } from "@/components/bus/bus-ticket-view";
import { useAppStore } from "@/store/app-store";
import type { BusBookingRecord } from "@/lib/seatseller/types";
import { toast } from "sonner";

export default function BusTicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { locale } = useAppStore();
  const api = useBusBookingApi();
  const [booking, setBooking] = useState<BusBookingRecord | null>(null);
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    void params.then(async ({ bookingId: id }) => {
      setBookingId(id);
      const data = await api.fetchBooking(id);
      if (data) setBooking(data);
    });
  }, [params]);

  const handleCancel = async () => {
    if (!booking) return;
    const data = await api.fetchCancellationData(booking.bookingId);
    if (!data) return;
    const ok = window.confirm(
      `Cancel this ticket?\nRefundable: ₹${data.refundableAmount}\nCharges: ₹${data.cancellationCharges}`
    );
    if (!ok) return;
    const updated = await api.cancelBooking(booking.bookingId);
    if (updated) {
      toast.success("Ticket cancelled");
      setBooking(updated);
    }
  };

  if (!booking) {
    return (
      <section className="container mx-auto px-4 py-16 text-center text-muted-foreground">
        Loading ticket…
      </section>
    );
  }

  return (
    <section className="container mx-auto max-w-3xl px-4 py-10">
      <BusTicketView
        booking={booking}
        locale={locale}
        showCancel
        onCancel={() => void handleCancel()}
      />
      <p className="mt-4 text-center text-sm text-slate-500">
        Booking reference: {bookingId}
      </p>
      <p className="text-center">
        <Link href="/bus/search" className="text-sm text-[#1a4fa3] hover:underline">
          Book another bus
        </Link>
      </p>
    </section>
  );
}
