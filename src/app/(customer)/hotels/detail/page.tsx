import { Suspense } from "react";
import { HotelDetailClient } from "@/components/hotels-tripjack/hotel-detail-client";

export const metadata = {
  title: "Hotel Details | Safar Sathi",
  description: "TripJack hotel rooms and pricing",
};

function DetailFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] text-slate-600">
      Loading hotel details…
    </div>
  );
}

export default function HotelDetailPage() {
  return (
    <Suspense fallback={<DetailFallback />}>
      <HotelDetailClient />
    </Suspense>
  );
}
