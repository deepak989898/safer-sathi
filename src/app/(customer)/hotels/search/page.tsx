import { HotelSearchClient } from "@/components/hotels-tripjack/hotel-search-client";

export const metadata = {
  title: "Search Hotels | Safar Sathi",
  description: "Search live hotels with TripJack",
};

export default function HotelSearchPage() {
  return <HotelSearchClient />;
}
