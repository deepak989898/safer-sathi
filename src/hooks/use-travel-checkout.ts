"use client";

import { useState } from "react";
import {
  isDemoPaymentMode,
  openRazorpayCheckout,
} from "@/lib/payments/razorpay-client";
import { toast } from "sonner";
import type { CustomPackageQuote } from "@/types/travel-manager";
import type { Booking, Hotel, ServiceType, Vehicle } from "@/types";

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

export interface CatalogCheckoutInput {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: ServiceType;
  serviceId: string;
  serviceName: { en: string; hi: string };
  startDate: string;
  endDate?: string;
  guests: number;
  amount: number;
  bookingMode?: "day" | "km";
  distanceKm?: number;
  userId?: string;
  notes?: string;
}

interface CreatedBooking {
  id: string;
  bookingNumber: string;
}

async function runPaymentForBooking(
  booking: CreatedBooking,
  amount: number,
  serviceNameEn: string,
  customer: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  }
) {
  const orderRes = await fetch("/api/payments/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount,
      receipt: booking.bookingNumber,
      notes: { bookingId: booking.id },
    }),
  });

  const orderJson = await orderRes.json();
  if (!orderJson.success) {
    const detail =
      typeof orderJson.details === "object"
        ? JSON.stringify(orderJson.details)
        : "";
    throw new Error(
      detail
        ? `${orderJson.error ?? "Failed to create payment order"}: ${detail}`
        : (orderJson.error ?? "Failed to create payment order")
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
    customerName: customer.customerName,
    customerEmail: customer.customerEmail,
    customerPhone: customer.customerPhone,
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
      customerEmail: customer.customerEmail,
      customerPhone: customer.customerPhone,
      customerName: customer.customerName,
    }),
  });

  const verifyJson = await verifyRes.json();
  if (!verifyJson.success) {
    throw new Error(verifyJson.error ?? "Payment verification failed");
  }

  if (isDemoPaymentMode(order.keyId, order.demo)) {
    toast.info("Demo payment mode — booking confirmed locally.");
  } else {
    toast.success(`Payment successful! Booking ${booking.bookingNumber} confirmed.`);
  }

  return { booking, payment, demo: order.demo };
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
          detail
            ? `${bookingJson.error ?? "Failed to create booking"}: ${detail}`
            : (bookingJson.error ?? "Failed to create booking")
        );
      }

      return runPaymentForBooking(bookingJson.data, amount, serviceNameEn, {
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
      });
    } finally {
      setPaying(false);
    }
  };

  const completeCatalogBooking = async (input: CatalogCheckoutInput) => {
    setPaying(true);
    try {
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          serviceType: input.serviceType,
          serviceId: input.serviceId,
          serviceName: input.serviceName,
          startDate: input.startDate,
          endDate: input.endDate,
          guests: input.guests,
          amount: input.amount,
          bookingMode: input.bookingMode,
          distanceKm: input.distanceKm,
          userId: input.userId,
          notes: input.notes,
        }),
      });

      const bookingJson = await bookingRes.json();
      if (!bookingJson.success) {
        const detail =
          typeof bookingJson.details === "object"
            ? JSON.stringify(bookingJson.details)
            : "";
        throw new Error(
          detail
            ? `${bookingJson.error ?? "Failed to create booking"}: ${detail}`
            : (bookingJson.error ?? "Failed to create booking")
        );
      }

      return runPaymentForBooking(
        bookingJson.data,
        input.amount,
        input.serviceName.en,
        {
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
        }
      );
    } finally {
      setPaying(false);
    }
  };

  const payExistingBooking = async (booking: Booking) => {
    if (booking.paymentStatus === "paid") {
      throw new Error("This booking is already paid.");
    }

    setPaying(true);
    try {
      return runPaymentForBooking(
        { id: booking.id, bookingNumber: booking.bookingNumber },
        booking.amount,
        booking.serviceName.en,
        {
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
        }
      );
    } finally {
      setPaying(false);
    }
  };

  return { completeBooking, completeCatalogBooking, payExistingBooking, paying };
}
