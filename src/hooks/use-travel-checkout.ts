"use client";

import { useState } from "react";
import {
  isDemoPaymentMode,
  openRazorpayCheckout,
} from "@/lib/payments/razorpay-client";
import { toast } from "sonner";
import type { CustomPackageQuote } from "@/types/travel-manager";
import type { Hotel, Vehicle } from "@/types";

export interface TravelCheckoutInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  travelDate: string;
  guests: number;
  pickupCity?: string;
  specialRequest?: string;
  packageQuote?: CustomPackageQuote;
  hotel?: Hotel;
  vehicle?: Vehicle;
  userId?: string;
}

export function useTravelCheckout() {
  const [paying, setPaying] = useState(false);

  const completeBooking = async (input: TravelCheckoutInput) => {
    setPaying(true);
    try {
      const amount =
        input.packageQuote?.totalAmount ??
        (input.hotel?.priceFrom ?? 0) + (input.vehicle?.pricePerDay ?? 0);

      const serviceType = input.packageQuote
        ? "holiday"
        : input.hotel
          ? "hotel"
          : "vehicle";

      const serviceId =
        input.packageQuote?.serviceId ??
        input.hotel?.id ??
        input.vehicle?.id ??
        `ai_${Date.now()}`;

      const serviceNameEn =
        input.packageQuote?.title ??
        input.hotel?.name.en ??
        input.vehicle?.name.en ??
        "Safar Sathi Booking";

      const endDate = input.packageQuote?.durationDays
        ? new Date(
            new Date(input.travelDate).getTime() +
              (input.packageQuote.durationDays - 1) * 86400000
          )
            .toISOString()
            .slice(0, 10)
        : undefined;

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          serviceType,
          serviceId,
          serviceName: { en: serviceNameEn, hi: serviceNameEn },
          startDate: input.travelDate,
          endDate,
          guests: input.guests,
          amount,
          userId: input.userId,
          notes: input.packageQuote?.notes ?? input.specialRequest,
          aiProcessed: true,
        }),
      });

      const bookingJson = await bookingRes.json();
      if (!bookingJson.success) {
        const detail =
          typeof bookingJson.details === "object"
            ? JSON.stringify(bookingJson.details)
            : "";
        throw new Error(
          detail ? `${bookingJson.error ?? "Failed to create booking"}: ${detail}` : (bookingJson.error ?? "Failed to create booking")
        );
      }

      const booking = bookingJson.data;

      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          receipt: booking.bookingNumber,
          notes: { bookingId: booking.id, source: "ai_travel_manager" },
        }),
      });

      const orderJson = await orderRes.json();
      if (!orderJson.success) {
        const detail =
          typeof orderJson.details === "object"
            ? JSON.stringify(orderJson.details)
            : "";
        throw new Error(
          detail ? `${orderJson.error ?? "Failed to create payment order"}: ${detail}` : (orderJson.error ?? "Failed to create payment order")
        );
      }

      const order = orderJson.data;
      const payment = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: "Safar Sathi",
        description: serviceNameEn,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        demo: order.demo,
      });

      const verifyRes = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: payment.razorpayOrderId,
          razorpayPaymentId: payment.razorpayPaymentId,
          razorpaySignature: payment.razorpaySignature,
          bookingId: booking.id,
          amount,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          customerName: input.customerName,
        }),
      });

      const verifyJson = await verifyRes.json();
      if (!verifyJson.success) {
        throw new Error(verifyJson.error ?? "Payment verification failed");
      }

      if (isDemoPaymentMode(order.keyId, order.demo)) {
        toast.info("Demo payment mode — booking confirmed locally.");
      } else {
        toast.success("Payment successful! Confirmation sent.");
      }

      return { booking, payment, demo: order.demo };
    } finally {
      setPaying(false);
    }
  };

  return { completeBooking, paying };
}
