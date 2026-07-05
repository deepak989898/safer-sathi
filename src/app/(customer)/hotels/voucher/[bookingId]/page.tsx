"use client";

import { use } from "react";
import { RequireAuth } from "@/components/auth/require-auth";
import { HotelVoucherView } from "@/components/hotels-tripjack/hotel-voucher-view";

export default function HotelVoucherPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  return (
    <RequireAuth>
      <HotelVoucherView bookingId={bookingId} />
    </RequireAuth>
  );
}
