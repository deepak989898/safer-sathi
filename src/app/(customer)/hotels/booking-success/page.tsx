"use client";

import { Suspense } from "react";
import { HotelBookingSuccessClient } from "@/components/hotels-tripjack/hotel-booking-success-client";

export default function HotelBookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
          Loading…
        </div>
      }
    >
      <HotelBookingSuccessClient />
    </Suspense>
  );
}
