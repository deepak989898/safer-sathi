import { getBusRoutes } from "@/lib/data-service";
import BusBookingClient from "./bus-booking-client";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Bus Booking India | Safar Sathi",
  description:
    "Search and book intercity bus tickets across India with verified operators and instant confirmation.",
  path: "/bus-booking",
  keywords: ["bus booking India", "intercity bus tickets", "online bus reservation", "Safar Sathi bus"],
});

export default async function BusBookingPage() {
  const routes = await getBusRoutes();
  return <BusBookingClient initialRoutes={routes} />;
}
