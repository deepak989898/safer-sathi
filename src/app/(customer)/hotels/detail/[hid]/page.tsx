import { Suspense } from "react";
import { HotelDetailClient } from "@/components/hotels-tripjack/hotel-detail-client";

export const metadata = {
  title: "Hotel Rooms & Pricing | Safar Sathi",
  description: "Live hotel room options and pricing",
};

function DetailFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] text-slate-600">
      Loading hotel pricing…
    </div>
  );
}

export default async function HotelDetailByHidPage({
  params,
}: {
  params: Promise<{ hid: string }>;
}) {
  const { hid } = await params;

  return (
    <Suspense fallback={<DetailFallback />}>
      <HotelDetailClient hid={hid} />
    </Suspense>
  );
}
