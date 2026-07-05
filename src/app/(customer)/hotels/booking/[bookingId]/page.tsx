"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { HotelBookingDetailClient } from "@/components/hotels-tripjack/hotel-booking-detail-client";

export default function HotelBookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  return (
    <RequireAuth>
      <HotelBookingDetailClient bookingId={bookingId} />
    </RequireAuth>
  );
}
