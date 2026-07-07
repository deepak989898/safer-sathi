"use client";

import { useCallback, useState } from "react";
import { customerApiFetch } from "@/lib/admin/api-client";
import { autoLoginHotelGuestAfterPayment } from "@/lib/hotels/guest-auto-login";
import { parseHotelApiClientError } from "@/lib/hotels/customer-messages";
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

  const parseJsonError = (json: { error?: string; details?: { code?: string } }) => {
    throw new Error(parseHotelApiClientError(json));
  };

  const prepareBooking = useCallback(
    async (input: {
      review: NormalizedHotelReviewResult;
      guestDetails: HotelGuestDetailsForm;
      reviewHash?: string;
    }) => {
      return run(async () => {
        const res = await fetch("/api/hotels/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!json.success) parseJsonError(json);
        return json.data.booking as HotelBookingRecord;
      });
    },
    [run]
  );

  const payForBooking = useCallback(
    async (
      booking: HotelBookingRecord,
      customer: { name: string; email: string; phone: string },
      options?: { isStaff?: boolean; priceConfirmed?: boolean }
    ) => {
      return run(async () => {
        const orderRes = await fetch("/api/hotels/payments/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingId: booking.bookingId,
            priceConfirmed: options?.priceConfirmed,
          }),
        });
        const orderJson = await orderRes.json();
        if (!orderJson.success) parseJsonError(orderJson);

        const orderData = orderJson.data as {
          requiresPriceConfirmation?: boolean;
          priceChanged?: boolean;
          previousPrice?: number;
          currentPrice?: number;
          booking?: HotelBookingRecord;
          keyId?: string;
          orderId?: string;
          id?: string;
          amount?: number;
          currency?: string;
          demo?: boolean;
        };

        if (orderData.requiresPriceConfirmation) {
          return {
            priceChangeRequired: true as const,
            previousPrice: orderData.previousPrice ?? booking.totalFare,
            currentPrice: orderData.currentPrice ?? booking.totalFare,
            currency: orderData.currency ?? booking.currency,
            booking: orderData.booking ?? booking,
          };
        }

        const order = orderData;
        const orderId = order.orderId ?? order.id;
        if (!orderId || order.amount == null) {
          throw new Error("Payment order could not be created");
        }

        const checkout = await openRazorpayCheckout({
          keyId: order.keyId,
          orderId,
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
        if (!verifyJson.success) parseJsonError(verifyJson);

        if (options?.isStaff) console.log("[hotel-payment] verified:", verifyJson.data);

        const payload = verifyJson.data as {
          booking: HotelBookingRecord;
          manualReview?: boolean;
          message?: string;
          loginCredentials?: { loginEmail: string; loginPassword: string } | null;
        };

        if (payload.loginCredentials) {
          await autoLoginHotelGuestAfterPayment(payload.loginCredentials);
        }

        return payload;
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
        const payload = json.data as {
          booking: HotelBookingRecord;
          manualReview?: boolean;
          message?: string;
          loginCredentials?: { loginEmail: string; loginPassword: string } | null;
        };
        if (payload.loginCredentials) {
          await autoLoginHotelGuestAfterPayment(payload.loginCredentials);
        }
        return payload;
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
    async (bookingId: string, options?: { publicAccess?: boolean }) => {
      return run(async () => {
        const res = options?.publicAccess
          ? await fetch(`/api/hotels/bookings/${bookingId}`)
          : await customerApiFetch(`/api/hotels/bookings/${bookingId}`);
        const json = await res.json();
        if (!json.success) parseJsonError(json);
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

  const pollBookingStatus = useCallback(
    async (
      bookingId: string,
      onUpdate?: (booking: HotelBookingRecord) => void
    ): Promise<HotelBookingRecord | null> => {
      const { HOTEL_BOOKING_POLL_DELAYS_MS, sleep } = await import(
        "@/lib/hotels/booking-poll-schedule"
      );
      const {
        isHotelBookingConfirmedStatus,
        isHotelBookingTerminalFailure,
      } = await import("@/lib/hotels/booking-status-helpers");

      let latest: HotelBookingRecord | null = null;

      for (let i = 0; i <= HOTEL_BOOKING_POLL_DELAYS_MS.length; i += 1) {
        latest = await refreshBookingDetail(bookingId);
        if (latest) onUpdate?.(latest);
        if (
          latest &&
          (isHotelBookingConfirmedStatus(latest) || isHotelBookingTerminalFailure(latest))
        ) {
          return latest;
        }
        if (i < HOTEL_BOOKING_POLL_DELAYS_MS.length) {
          await sleep(HOTEL_BOOKING_POLL_DELAYS_MS[i]);
        }
      }

      return latest;
    },
    [refreshBookingDetail]
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
    pollBookingStatus,
    fetchCancellationEstimate,
    confirmCancellation,
  };
}
