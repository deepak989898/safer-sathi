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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    void params.then(async ({ bookingId: id }) => {
      setBookingId(id);
      const data = await api.fetchBooking(id);
      if (data) {
        setBooking(data);
        setLoadError(null);
      } else {
        setLoadError("Booking not found or ticket is not available yet.");
      }
    });
  }, [params]);

  if (loadError && !booking) {
    return (
      <section className="container mx-auto max-w-lg px-4 py-16 text-center">
        <p className="font-semibold text-slate-900">Unable to load ticket</p>
        <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
        <Link href="/flights" className="mt-6 inline-block text-sm text-[#1a4fa3] hover:underline">
          Back to flights
        </Link>
      </section>
    );
  }

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
