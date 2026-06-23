"use client";

import { useState } from "react";
import {
  isDemoPaymentMode,
  openRazorpayCheckout,
} from "@/lib/payments/razorpay-client";
import {
  calculatePayNowAmount,
  type PaymentPlan,
} from "@/lib/payments/booking-payment";
import {
  trackBookingCompleted,
  trackPaymentFailed,
  trackPaymentSuccess,
  trackPurchase,
} from "@/lib/analytics";
import {
  saveBookingToClient,
  updateBookingPaymentOnClient,
} from "@/lib/bookings/booking-client";
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
  paymentPlan?: PaymentPlan;
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
  paymentPlan?: PaymentPlan;
}

interface CreatedBooking {
  id: string;
  bookingNumber: string;
  amount: number;
  paidAmount?: number;
  notes?: string;
}

async function persistBookingRecord(booking: Booking): Promise<void> {
  const clientSaved = await saveBookingToClient(booking);
  if (!clientSaved) {
    console.warn("Client booking backup save failed for", booking.bookingNumber);
  }
}

async function markPaymentFailed(
  bookingId: string,
  reason: string,
  existingNotes?: string
) {
  const payload = {
    paymentStatus: "failed" as const,
    paymentFailureReason: reason,
    lastPaymentAttemptAt: new Date().toISOString(),
    notes: [existingNotes, `[Payment failed] ${reason}`].filter(Boolean).join("\n"),
  };

  try {
    await fetch(`/api/bookings/${bookingId}/payment-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // Server may be unavailable — fall back to client Firestore.
  }

  await updateBookingPaymentOnClient(bookingId, payload);
}

async function runPaymentForBooking(
  booking: CreatedBooking,
  totalAmount: number,
  payAmount: number,
  serviceNameEn: string,
  customer: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  },
  paymentPlan: PaymentPlan,
  serviceType?: string
) {
  const orderRes = await fetch("/api/payments/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: payAmount,
      receipt: booking.bookingNumber,
      notes: {
        bookingId: booking.id,
        paymentPlan,
        totalAmount: String(totalAmount),
      },
    }),
  });

  const orderJson = await orderRes.json();
  if (!orderJson.success) {
    const detail =
      typeof orderJson.details === "object"
        ? JSON.stringify(orderJson.details)
        : "";
    const message =
      detail
        ? `${orderJson.error ?? "Failed to create payment order"}: ${detail}`
        : (orderJson.error ?? "Failed to create payment order");
    await markPaymentFailed(booking.id, message, booking.notes);
    throw new Error(message);
  }

  const order = orderJson.data;

  let payment;
  try {
    payment = await openRazorpayCheckout({
      keyId: order.keyId,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "Safar Sathi",
      description:
        paymentPlan === "full"
          ? `${serviceNameEn} — full payment`
          : `${serviceNameEn} — ${payAmount === totalAmount ? "full" : "10% advance"}`,
      customerName: customer.customerName,
      customerEmail: customer.customerEmail,
      customerPhone: customer.customerPhone,
      demo: order.demo,
    });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Payment cancelled or failed";
    await markPaymentFailed(booking.id, reason, booking.notes);
    trackPaymentFailed(reason, booking.id);
    throw new Error(
      `${reason} Your booking ${booking.bookingNumber} is saved — admin can follow up or you can retry payment from My Bookings.`
    );
  }

  const verifyRes = await fetch("/api/payments/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      razorpaySignature: payment.razorpaySignature,
      bookingId: booking.id,
      amount: payAmount,
      paymentPlan,
      customerEmail: customer.customerEmail,
      customerPhone: customer.customerPhone,
      customerName: customer.customerName,
    }),
  });

  const verifyJson = await verifyRes.json();
  if (!verifyJson.success) {
    const failReason = verifyJson.error ?? "Payment verification failed";
    await markPaymentFailed(booking.id, failReason, booking.notes);
    trackPaymentFailed(failReason, booking.id);
    throw new Error(
      `${failReason}. Booking ${booking.bookingNumber} is saved for admin review.`
    );
  }

  await updateBookingPaymentOnClient(booking.id, {
    status: "confirmed",
    paymentStatus:
      paymentPlan === "full" || payAmount >= totalAmount ? "paid" : "partial",
    paidAmount: payAmount,
    paymentPlan,
    paymentFailureReason: undefined,
    lastPaymentAttemptAt: new Date().toISOString(),
  });

  trackPaymentSuccess(payAmount, booking.id, serviceType);
  trackPurchase(payAmount, {
    item_id: booking.id,
    item_name: serviceNameEn,
    service_type: serviceType as "package" | "hotel" | "vehicle" | undefined,
    payment_plan: paymentPlan,
  });
  trackBookingCompleted(serviceType ?? "other", booking.id, totalAmount, paymentPlan);

  if (isDemoPaymentMode(order.keyId, order.demo)) {
    toast.info("Demo payment mode — booking confirmed locally.");
  }

  return { booking, payment, demo: order.demo, payAmount };
}

export function useTravelCheckout() {
  const [paying, setPaying] = useState(false);

  const completeBooking = async (input: TravelCheckoutInput) => {
    setPaying(true);
    try {
      const amount =
        input.packageQuote?.totalAmount ??
        (input.hotel?.priceFrom ?? 0) + (input.vehicle?.pricePerDay ?? 0);
      const paymentPlan = input.paymentPlan ?? "advance";
      const payAmount = calculatePayNowAmount(amount, paymentPlan);

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
          paymentPlan,
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

      const created = bookingJson.data as Booking;
      await persistBookingRecord(created);

      return runPaymentForBooking(
        { ...created, amount },
        amount,
        payAmount,
        serviceNameEn,
        {
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
        },
        paymentPlan,
        serviceType
      );
    } finally {
      setPaying(false);
    }
  };

  const completeCatalogBooking = async (input: CatalogCheckoutInput) => {
    setPaying(true);
    try {
      const paymentPlan = input.paymentPlan ?? "advance";
      const payAmount = calculatePayNowAmount(input.amount, paymentPlan);

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
          paymentPlan,
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

      const created = bookingJson.data as Booking;
      await persistBookingRecord(created);

      return runPaymentForBooking(
        { ...created, amount: input.amount },
        input.amount,
        payAmount,
        input.serviceName.en,
        {
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
        },
        paymentPlan,
        input.serviceType
      );
    } finally {
      setPaying(false);
    }
  };

  const payExistingBooking = async (
    booking: Booking,
    paymentPlan: PaymentPlan = "full"
  ) => {
    if (booking.paymentStatus === "paid") {
      throw new Error("This booking is already paid.");
    }

    setPaying(true);
    try {
      const payAmount = calculatePayNowAmount(
        booking.amount,
        paymentPlan,
        booking.paidAmount ?? 0
      );

      if (payAmount <= 0) {
        throw new Error("Nothing left to pay on this booking.");
      }

      return runPaymentForBooking(
        {
          id: booking.id,
          bookingNumber: booking.bookingNumber,
          amount: booking.amount,
          paidAmount: booking.paidAmount,
        },
        booking.amount,
        payAmount,
        booking.serviceName.en,
        {
          customerName: booking.customerName,
          customerEmail: booking.customerEmail,
          customerPhone: booking.customerPhone,
        },
        booking.paidAmount && booking.paidAmount > 0 ? "full" : paymentPlan,
        booking.serviceType
      );
    } finally {
      setPaying(false);
    }
  };

  return { completeBooking, completeCatalogBooking, payExistingBooking, paying };
}
