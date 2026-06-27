import { listAdminNotifications } from "@/lib/admin/notifications";
import { confirmPaidBooking } from "@/lib/bookings/confirm-paid-booking";
import {
  getBookingById,
  getBookingByNumber,
} from "@/lib/data-service";
import {
  fetchCapturedPaymentForOrder,
  fetchRazorpayOrder,
  fetchRazorpayOrderByReceipt,
  fetchRazorpayPayment,
  isDemoPaymentIdentifier,
} from "@/lib/payments/razorpay";
import type { Booking } from "@/types";

export interface BookingRecoveryLookup {
  booking: Booking | null;
  bookingNumber: string;
  source: "database" | "notification_id" | "not_found";
  storedBookingId?: string;
  notificationTitle?: string;
  notificationMessage?: string;
  razorpayPayment?: Awaited<ReturnType<typeof fetchRazorpayPayment>>;
  razorpayOrder?: Awaited<ReturnType<typeof fetchRazorpayOrder>>;
  warnings: string[];
}

function normalizeBookingNumber(value: string): string {
  return value.trim().toUpperCase();
}

export async function lookupBookingForRecovery(input: {
  bookingNumber: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
}): Promise<BookingRecoveryLookup> {
  const bookingNumber = normalizeBookingNumber(input.bookingNumber);
  const warnings: string[] = [];

  let booking = await getBookingByNumber(bookingNumber);
  let source: BookingRecoveryLookup["source"] = booking ? "database" : "not_found";
  let storedBookingId: string | undefined;
  let notificationTitle: string | undefined;
  let notificationMessage: string | undefined;

  if (!booking) {
    const notifications = await listAdminNotifications(80);
    const match = notifications.find(
      (item) =>
        item.title.toUpperCase().includes(bookingNumber) ||
        item.message.toUpperCase().includes(bookingNumber)
    );

    if (match?.bookingId) {
      storedBookingId = match.bookingId;
      notificationTitle = match.title;
      notificationMessage = match.message;
      booking = await getBookingById(match.bookingId);
      source = booking ? "notification_id" : "notification_id";
      if (!booking) {
        warnings.push(
          `Admin notification found for ${bookingNumber}, but the booking record is missing from the database (id: ${match.bookingId}).`
        );
      }
    } else {
      warnings.push(`No booking record found for ${bookingNumber}.`);
    }
  }

  let razorpayPayment =
    input.razorpayPaymentId && !isDemoPaymentIdentifier(input.razorpayPaymentId)
      ? await fetchRazorpayPayment(input.razorpayPaymentId)
      : null;

  let razorpayOrder: Awaited<ReturnType<typeof fetchRazorpayOrder>> = null;

  if (input.razorpayOrderId && !isDemoPaymentIdentifier(input.razorpayOrderId)) {
    razorpayOrder = await fetchRazorpayOrder(input.razorpayOrderId);
  }

  if (!razorpayOrder) {
    razorpayOrder = await fetchRazorpayOrderByReceipt(bookingNumber);
    if (razorpayOrder) {
      warnings.push("Razorpay order located by booking receipt.");
    }
  }

  if (!razorpayOrder && razorpayPayment?.orderId) {
    razorpayOrder = await fetchRazorpayOrder(razorpayPayment.orderId);
  }

  if (!razorpayPayment && razorpayOrder) {
    const paymentFromOrder = await fetchCapturedPaymentForOrder(razorpayOrder.id);
    if (paymentFromOrder) {
      razorpayPayment = paymentFromOrder;
      warnings.push("Razorpay payment auto-detected from order.");
    }
  }

  if (razorpayOrder?.receipt) {
    const receipt = normalizeBookingNumber(razorpayOrder.receipt);
    if (receipt !== bookingNumber) {
      warnings.push(
        `Razorpay order receipt (${razorpayOrder.receipt}) does not match the booking number (${bookingNumber}).`
      );
    }
    if (!booking && razorpayOrder.notes.bookingId) {
      booking = await getBookingById(razorpayOrder.notes.bookingId);
      if (booking) {
        source = "database";
        warnings.push("Booking located via Razorpay order notes.");
      }
    }
  }

  if (razorpayPayment && !razorpayPayment.captured && razorpayPayment.status !== "authorized") {
    warnings.push(`Razorpay payment status is "${razorpayPayment.status}" (not captured).`);
  }

  return {
    booking,
    bookingNumber,
    source,
    storedBookingId,
    notificationTitle,
    notificationMessage,
    razorpayPayment,
    razorpayOrder,
    warnings,
  };
}

export interface RecoverPaidBookingInput {
  bookingNumber: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  paidAmount?: number;
  paymentPlan?: Booking["paymentPlan"];
  sendConfirmation?: boolean;
  recoveredBy: string;
}

export async function recoverPaidBooking(input: RecoverPaidBookingInput) {
  const lookup = await lookupBookingForRecovery({
    bookingNumber: input.bookingNumber,
    razorpayPaymentId: input.razorpayPaymentId,
    razorpayOrderId: input.razorpayOrderId,
  });

  if (!lookup.booking) {
    return {
      ok: false as const,
      error:
        lookup.warnings[0] ??
        "Booking not found. Ensure the booking number is correct or restore the booking record first.",
      lookup,
    };
  }

  const booking = lookup.booking;

  if (booking.status === "confirmed" && booking.paymentStatus === "paid") {
    return {
      ok: false as const,
      error: `Booking ${booking.bookingNumber} is already confirmed and paid.`,
      lookup,
    };
  }

  let paidAmount = input.paidAmount;
  const paymentPlan =
    input.paymentPlan ??
    (lookup.razorpayOrder?.notes.paymentPlan as Booking["paymentPlan"] | undefined) ??
    booking.paymentPlan ??
    "advance";

  if (lookup.razorpayPayment) {
    if (!lookup.razorpayPayment.captured && lookup.razorpayPayment.status !== "authorized") {
      return {
        ok: false as const,
        error: `Razorpay payment is not captured (status: ${lookup.razorpayPayment.status}).`,
        lookup,
      };
    }
    paidAmount = lookup.razorpayPayment.amount;
  } else if (lookup.razorpayOrder && lookup.razorpayOrder.amountPaid > 0) {
    paidAmount = lookup.razorpayOrder.amountPaid;
  }

  if (!paidAmount || paidAmount <= 0) {
    return {
      ok: false as const,
      error: "Paid amount is required when Razorpay payment ID is not provided.",
      lookup,
    };
  }

  const recoveryNote = [
    `[Recovered by admin: ${input.recoveredBy}]`,
    input.razorpayPaymentId ? `Razorpay payment: ${input.razorpayPaymentId}` : null,
    input.razorpayOrderId ? `Razorpay order: ${input.razorpayOrderId}` : null,
    `Recovered paid amount: ₹${paidAmount.toLocaleString("en-IN")}`,
  ]
    .filter(Boolean)
    .join(" ");

  const result = await confirmPaidBooking({
    booking,
    paidAmount,
    paymentPlan,
    recoveryNote,
    sendConfirmation: input.sendConfirmation ?? true,
    notificationTitle: `Booking recovered — ${booking.bookingNumber}`,
  });

  return {
    ok: true as const,
    lookup,
    ...result,
  };
}
