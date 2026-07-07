import { Suspense } from "react";
import { HotelReviewClient } from "@/components/hotels-tripjack/hotel-review-client";

export const metadata = {
  title: "Review Hotel Booking | Safar Sathi",
  description: "Confirm your hotel booking before guest details",
};

function ReviewFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] text-slate-600">
      Loading booking review…
    </div>
  );
}

export default function HotelReviewPage() {
  return (
    <Suspense fallback={<ReviewFallback />}>
      <HotelReviewClient />
    </Suspense>
  );
}
