import { FlightPassengersClient } from "@/components/flights/flight-passengers-client";

export const metadata = {
  title: "Passenger Details | Safar Sathi Flights",
  description: "Enter passenger details and validate flight fare",
};

export default function FlightPassengersPage() {
  return <FlightPassengersClient />;
}
