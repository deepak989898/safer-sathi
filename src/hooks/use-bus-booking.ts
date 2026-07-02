"use client";

import { useCallback, useState } from "react";
import { customerApiFetch } from "@/lib/admin/api-client";
import type {
  BusBookingRecord,
  BusPassengerDetail,
  SeatSellerBpDpDetails,
  SeatSellerTripDetails,
} from "@/lib/seatseller/types";
import type { BusCityRecord } from "@/lib/seatseller/types";
import type { BusSelectedTrip } from "@/lib/bus/session";
import { openRazorpayCheckout } from "@/lib/payments/razorpay-client";

export function useBusBookingApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCities = useCallback(async () => {
    return run(async () => {
      const res = await fetch("/api/bus/cities");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load cities");
      return json.data.cities as BusCityRecord[];
    });
  }, [run]);

  const searchTrips = useCallback(
    async (input: { source: string; destination: string; doj: string }) => {
      return run(async () => {
        const res = await fetch("/api/bus/available-trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Search failed");
        return {
          trips: json.data.trips as BusSelectedTrip[],
          doj: json.data.doj as string,
        };
      });
    },
    [run]
  );

  const fetchTripDetails = useCallback(
    async (tripId: string) => {
      return run(async () => {
        const res = await fetch("/api/bus/trip-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Seat layout failed");
        return json.data.details as SeatSellerTripDetails;
      });
    },
    [run]
  );

  const fetchBpDp = useCallback(
    async (tripId: string) => {
      return run(async () => {
        const res = await fetch("/api/bus/bpdp-details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load points");
        return json.data as SeatSellerBpDpDetails;
      });
    },
    [run]
  );

  const blockTicket = useCallback(
    async (payload: Record<string, unknown>) => {
      return run(async () => {
        const res = await customerApiFetch("/api/bus/block-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Block failed");
        return json.data as {
          booking: BusBookingRecord;
          blockExpiresAt: string;
        };
      });
    },
    [run]
  );

  const payForBooking = useCallback(
    async (booking: BusBookingRecord, customer: { name: string; email: string; phone: string }) => {
      return run(async () => {
        const orderRes = await fetch("/api/bus/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.bookingId }),
        });
        const orderJson = await orderRes.json();
        if (!orderJson.success) throw new Error(orderJson.error ?? "Order failed");

        const order = orderJson.data;

        const checkout = await openRazorpayCheckout({
          keyId: order.keyId,
          orderId: order.orderId ?? order.id,
          amount: order.amount,
          currency: order.currency ?? "INR",
          name: "Safar Sathi",
          description: `Bus — ${booking.sourceCityName} to ${booking.destinationCityName}`,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          demo: order.demo,
        });

        const verifyRes = await fetch("/api/bus/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: booking.bookingId,
            razorpayOrderId: checkout.razorpayOrderId,
            razorpayPaymentId: checkout.razorpayPaymentId,
            razorpaySignature: checkout.razorpaySignature,
          }),
        });
        const verifyJson = await verifyRes.json();
        if (!verifyJson.success) throw new Error(verifyJson.error ?? "Verification failed");
        return verifyJson.data as {
          booking: BusBookingRecord;
          manualReview?: boolean;
          message?: string;
        };
      });
    },
    [run]
  );

  const fetchMyBookings = useCallback(async () => {
    return run(async () => {
      const res = await customerApiFetch("/api/bus/bookings");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load bookings");
      return json.data.bookings as BusBookingRecord[];
    });
  }, [run]);

  const fetchCancellationData = useCallback(
    async (bookingId: string) => {
      return run(async () => {
        const res = await customerApiFetch("/api/bus/cancellation-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed");
        return json.data.cancellation;
      });
    },
    [run]
  );

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      return run(async () => {
        const res = await customerApiFetch("/api/bus/cancel-ticket", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Cancel failed");
        return json.data.booking as BusBookingRecord;
      });
    },
    [run]
  );

  return {
    loading,
    error,
    fetchCities,
    searchTrips,
    fetchTripDetails,
    fetchBpDp,
    blockTicket,
    payForBooking,
    fetchMyBookings,
    fetchCancellationData,
    cancelBooking,
  };
}

export type { BusPassengerDetail };
