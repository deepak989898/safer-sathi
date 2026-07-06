"use client";

import { use } from "react";
import { HotelVoucherView } from "@/components/hotels-tripjack/hotel-voucher-view";

export default function HotelVoucherPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  return <HotelVoucherView bookingId={bookingId} />;
}
