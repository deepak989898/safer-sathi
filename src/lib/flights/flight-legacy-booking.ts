import type { FlightBookingRecord } from "@/lib/flights/types";
import type { Booking } from "@/types";

export function flightBookingToLegacyBooking(flight: FlightBookingRecord): Booking {
  const now = new Date().toISOString();
  const ref = flight.pnr ?? flight.bookingId.slice(-8).toUpperCase();

  return {
    id: flight.bookingId,
    bookingNumber: ref,
    userId: flight.userId,
    customerName: flight.customerName,
    customerEmail: flight.customerEmail,
    customerPhone: flight.customerMobile,
    serviceType: "flight",
    serviceId: flight.tripjackBookingId || flight.bookingId,
    serviceName: {
      en: `${flight.airlineName} ${flight.sourceCode} → ${flight.destinationCode}`,
      hi: `${flight.airlineName} ${flight.sourceCode} → ${flight.destinationCode}`,
    },
    startDate: flight.travelDate,
    guests: flight.passengers.length,
    amount: flight.totalFare,
    paidAmount: flight.paymentStatus === "paid" ? flight.totalFare : 0,
    departure: `${flight.sourceCity} (${flight.sourceCode})`,
    destination: `${flight.destinationCity} (${flight.destinationCode})`,
    status: flight.status === "confirmed" ? "confirmed" : "pending",
    paymentStatus: flight.paymentStatus === "paid" ? "paid" : "pending",
    aiProcessed: false,
    notes: [
      `TripJack: ${flight.tripjackBookingId}`,
      flight.pnr ? `PNR: ${flight.pnr}` : null,
      flight.ticketNumber ? `Ticket: ${flight.ticketNumber}` : null,
    ]
      .filter(Boolean)
      .join(" | "),
    createdAt: flight.createdAt,
    updatedAt: now,
  };
}
