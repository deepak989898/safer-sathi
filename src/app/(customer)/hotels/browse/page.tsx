import { Suspense } from "react";
import { TripJackHotelsBrowseClient } from "@/components/hotels-tripjack/tripjack-hotels-browse-client";
import { TripJackResultsGridSkeleton } from "@/components/hotels-tripjack/tripjack-hotel-grid-skeleton";

export const metadata = {
  title: "All TripJack Hotels | Safar Sathi",
  description: "Browse all live TripJack hotels in India with filters and pagination.",
};

export default function TripJackHotelsBrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-10">
          <TripJackResultsGridSkeleton count={6} />
        </div>
      }
    >
      <TripJackHotelsBrowseClient />
    </Suspense>
  );
}
