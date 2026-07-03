import { FlightFlowClient } from "@/components/flights/flight-flow-client";

export const metadata = {
  title: "Flight Search | Safar Sathi",
  description: "Search one-way flights across India with Safar Sathi",
};

export default function FlightsPage() {
  return <FlightFlowClient />;
}
