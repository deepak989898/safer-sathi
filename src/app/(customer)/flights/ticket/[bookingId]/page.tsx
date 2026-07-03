"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFlightBookingApi } from "@/hooks/use-flight-booking";
import { FlightTicketView } from "@/components/flights/flight-ticket-view";
import { useAppStore } from "@/store/app-store";
import type { FlightBookingRecord } from "@/lib/flights/types";

export default function FlightTicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { locale } = useAppStore();
  const api = useFlightBookingApi();
  const [booking, setBooking] = useState<FlightBookingRecord | null>(null);
  const [bookingId, setBookingId] = useState("");

  useEffect(() => {
    void params.then(async ({ bookingId: id }) => {
      setBookingId(id);
      const data = await api.fetchBooking(id);
      if (data) setBooking(data);
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
    <section className="container mx-auto max-w-3xl px-4 py-10">
      <FlightTicketView booking={booking} locale={locale} />
      <p className="mt-4 text-center text-sm text-slate-500">Booking reference: {bookingId}</p>
      <p className="text-center">
        <Link href="/flights" className="text-sm text-[#1a4fa3] hover:underline">
          Book another flight
        </Link>
      </p>
    </section>
  );
}
