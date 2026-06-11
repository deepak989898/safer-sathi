import { getBusRoutes } from "@/lib/data-service";
import BusBookingClient from "./bus-booking-client";

export default async function BusBookingPage() {
  const routes = await getBusRoutes();
  return <BusBookingClient initialRoutes={routes} />;
}
