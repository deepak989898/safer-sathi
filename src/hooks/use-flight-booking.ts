"use client";

import { useCallback, useState } from "react";
import { customerApiFetch } from "@/lib/admin/api-client";
import { openRazorpayCheckout } from "@/lib/payments/razorpay-client";
import type { FlightBookingRecord } from "@/lib/flights/types";
import type {
  FareValidateRequest,
  NormalizedFareValidate,
  NormalizedFlightReview,
} from "@/lib/tripjack/types";
import type { FlightPassengersSession } from "@/lib/flights/flight-session";

export function useFlightBookingApi() {
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

  const prepareBooking = useCallback(
    async (input: {
      review: NormalizedFlightReview;
      validated: NormalizedFareValidate;
      passengers: FlightPassengersSession;
      fareValidateRequest: FareValidateRequest;
      fareValidateResponse?: unknown;
      reviewResponse?: unknown;
      searchContext?: { fromCode: string; toCode: string; departureDate: string };
    }) => {
      return run(async () => {
        const res = await fetch("/api/flights/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review: input.review,
            validated: input.validated,
            passengers: input.passengers.passengers,
            delivery: input.passengers.delivery,
            fareValidateRequest: input.fareValidateRequest,
            fareValidateResponse: input.fareValidateResponse,
            reviewResponse: input.reviewResponse,
            searchContext: input.searchContext,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to prepare booking");
        return json.data.booking as FlightBookingRecord;
      });
    },
    [run]
  );

  const payForBooking = useCallback(
    async (
      booking: FlightBookingRecord,
      customer: { name: string; email: string; phone: string },
      options?: { isStaff?: boolean }
    ) => {
      return run(async () => {
        const createOrder = async (acceptFareChange?: boolean) => {
          const orderRes = await fetch("/api/flights/payments/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookingId: booking.bookingId,
              acceptFareChange: acceptFareChange ?? false,
            }),
          });
          return orderRes.json();
        };

        let orderJson = await createOrder(false);

        if (!orderJson.success && orderJson.details?.code === "fare_changed") {
          const previousFare = Number(orderJson.details?.previousFare ?? booking.totalFare);
          const newFare = Number(orderJson.details?.newFare ?? booking.totalFare);
          const accept = window.confirm(
            `The fare has changed from ₹${previousFare.toLocaleString("en-IN")} to ₹${newFare.toLocaleString("en-IN")}. Continue with the updated fare?`
          );
          if (!accept) {
            throw new Error("Payment cancelled — fare was updated by the airline.");
          }
          orderJson = await createOrder(true);
        }

        if (!orderJson.success) {
          throw new Error(orderJson.error ?? "Order failed");
        }

        const order = orderJson.data;
        if (options?.isStaff) {
          console.log("[flight-payment] Razorpay order:", order);
        }

        const checkout = await openRazorpayCheckout({
          keyId: order.keyId,
          orderId: order.orderId ?? order.id,
          amount: order.amount,
          currency: order.currency ?? "INR",
          name: "Safar Sathi",
          description: `Flight — ${booking.sourceCity} to ${booking.destinationCity}`,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          demo: order.demo,
        });

        const verifyRes = await fetch("/api/flights/payments/verify", {
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

        if (options?.isStaff) {
          console.log("[flight-payment] verified payment result:", verifyJson.data);
        }

        return verifyJson.data as {
          booking: FlightBookingRecord;
          manualReview?: boolean;
          bookingFailed?: boolean;
          message?: string;
          loginCredentials?: { loginEmail: string; loginPassword: string };
        };
      });
    },
    [run]
  );

  /** Developer testing: skip Razorpay, run Book → Details (server-gated). */
  const simulatePaymentSuccess = useCallback(
    async (booking: FlightBookingRecord, options?: { isStaff?: boolean }) => {
      return run(async () => {
        const res = await fetch("/api/flights/payments/simulate-success", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.bookingId }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Test payment simulation failed");

        if (options?.isStaff) {
          console.log("[flight-payment] TEST MODE result:", json.data);
        }

        return json.data as {
          booking: FlightBookingRecord;
          manualReview?: boolean;
          message?: string;
          testMode?: boolean;
        };
      });
    },
    [run]
  );

  const fetchMyBookings = useCallback(async () => {
    return run(async () => {
      const res = await customerApiFetch("/api/flights/bookings");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load bookings");
      return json.data.bookings as FlightBookingRecord[];
    });
  }, [run]);

  const fetchBooking = useCallback(
    async (bookingId: string) => {
      return run(async () => {
        const res = await customerApiFetch(`/api/flights/bookings/${bookingId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Booking not found");
        return json.data.booking as FlightBookingRecord;
      });
    },
    [run]
  );

  const refreshBookingDetail = useCallback(
    async (bookingId: string) => {
      return run(async () => {
        const res = await customerApiFetch(`/api/flights/bookings/${bookingId}/refresh-detail`, {
          method: "POST",
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to refresh booking details");
        return json.data.booking as FlightBookingRecord;
      });
    },
    [run]
  );

  const fetchCancellationCharges = useCallback(
    async (bookingId: string, remarks?: string) => {
      return run(async () => {
        const res = await customerApiFetch(
          `/api/flights/bookings/${bookingId}/cancellation-charges`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ remarks }),
          }
        );
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load cancellation charges");
        return json.data as {
          booking: FlightBookingRecord;
          charges: NonNullable<FlightBookingRecord["cancellationChargesNormalized"]>;
        };
      });
    },
    [run]
  );

  const confirmCancellation = useCallback(
    async (bookingId: string, remarks?: string) => {
      return run(async () => {
        const res = await customerApiFetch(`/api/flights/bookings/${bookingId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remarks }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to submit cancellation");
        return json.data.booking as FlightBookingRecord;
      });
    },
    [run]
  );

  const pollAmendment = useCallback(
    async (bookingId: string) => {
      return run(async () => {
        const res = await customerApiFetch(`/api/flights/bookings/${bookingId}/poll-amendment`, {
          method: "POST",
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to poll amendment");
        return json.data.booking as FlightBookingRecord;
      });
    },
    [run]
  );

  const releasePnr = useCallback(
    async (bookingId: string) => {
      return run(async () => {
        const res = await customerApiFetch(`/api/flights/bookings/${bookingId}/release-pnr`, {
          method: "POST",
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to release PNR");
        return json.data.booking as FlightBookingRecord;
      });
    },
    [run]
  );

  const adminRetry = useCallback(
    async (
      bookingId: string,
      action: "retry_poll" | "retry_booking_detail" | "retry_release_pnr" | "retry_book"
    ) => {
      return run(async () => {
        const res = await customerApiFetch(`/api/flights/bookings/${bookingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Admin action failed");
        return json.data.booking as FlightBookingRecord;
      });
    },
    [run]
  );

  return {
    loading,
    error,
    prepareBooking,
    payForBooking,
    simulatePaymentSuccess,
    fetchMyBookings,
    fetchBooking,
    refreshBookingDetail,
    fetchCancellationCharges,
    confirmCancellation,
    pollAmendment,
    releasePnr,
    adminRetry,
  };
}
