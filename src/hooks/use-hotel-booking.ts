"use client";

import { useCallback, useState } from "react";
import { customerApiFetch } from "@/lib/admin/api-client";
import { openRazorpayCheckout } from "@/lib/payments/razorpay-client";
import type { HotelBookingRecord } from "@/lib/hotels/types";
import type { NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import type { HotelGuestDetailsForm } from "@/lib/hotels/types";

export function useHotelBookingApi() {
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
    async (input: { review: NormalizedHotelReviewResult; guestDetails: HotelGuestDetailsForm }) => {
      return run(async () => {
        const res = await fetch("/api/hotels/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to prepare booking");
        return json.data.booking as HotelBookingRecord;
      });
    },
    [run]
  );

  const payForBooking = useCallback(
    async (
      booking: HotelBookingRecord,
      customer: { name: string; email: string; phone: string },
      options?: { isStaff?: boolean }
    ) => {
      return run(async () => {
        const orderRes = await fetch("/api/hotels/payments/create-order", {
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
          description: `Hotel — ${booking.hotelName}`,
          customerName: customer.name,
          customerEmail: customer.email,
          customerPhone: customer.phone,
          demo: order.demo,
        });

        const verifyRes = await fetch("/api/hotels/payments/verify", {
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

        if (options?.isStaff) console.log("[hotel-payment] verified:", verifyJson.data);
        return verifyJson.data as {
          booking: HotelBookingRecord;
          manualReview?: boolean;
          message?: string;
        };
      });
    },
    [run]
  );

  const simulatePaymentSuccess = useCallback(
    async (booking: HotelBookingRecord) => {
      return run(async () => {
        const res = await fetch("/api/hotels/payments/simulate-success", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.bookingId }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Test payment failed");
        return json.data as { booking: HotelBookingRecord; manualReview?: boolean; message?: string };
      });
    },
    [run]
  );

  const fetchMyBookings = useCallback(async () => {
    return run(async () => {
      const res = await customerApiFetch("/api/hotels/bookings");
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Failed to load bookings");
      return json.data.bookings as HotelBookingRecord[];
    });
  }, [run]);

  const fetchBooking = useCallback(
    async (bookingId: string) => {
      return run(async () => {
        const res = await customerApiFetch(`/api/hotels/bookings/${bookingId}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Booking not found");
        return json.data.booking as HotelBookingRecord;
      });
    },
    [run]
  );

  const refreshBookingDetail = useCallback(
    async (bookingId: string) => {
      return run(async () => {
        const res = await customerApiFetch(`/api/hotels/bookings/${bookingId}/refresh-detail`, {
          method: "POST",
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to refresh");
        return json.data.booking as HotelBookingRecord;
      });
    },
    [run]
  );

  const fetchCancellationEstimate = useCallback(
    async (bookingId: string) => {
      return run(async () => {
        const res = await customerApiFetch(`/api/hotels/bookings/${bookingId}/cancel`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Failed to load estimate");
        return json.data as {
          estimate: import("@/lib/hotels/cancellation-estimate").HotelCancellationEstimate;
          canCancel: boolean;
        };
      });
    },
    [run]
  );

  const confirmCancellation = useCallback(
    async (bookingId: string, remarks?: string) => {
      return run(async () => {
        const res = await customerApiFetch(`/api/hotels/bookings/${bookingId}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ remarks }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Cancellation failed");
        return json.data.booking as HotelBookingRecord;
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
    fetchCancellationEstimate,
    confirmCancellation,
  };
}
