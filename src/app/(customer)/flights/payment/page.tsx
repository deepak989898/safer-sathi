import { FlightPaymentClient } from "@/components/flights/flight-payment-client";

export const metadata = {
  title: "Flight Payment | Safar Sathi",
  description: "Pay for your validated flight fare",
};

export default function FlightPaymentPage() {
  return <FlightPaymentClient />;
}
