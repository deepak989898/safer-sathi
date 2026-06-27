import { listAdminNotifications } from "@/lib/admin/notifications";
import { confirmPaidBooking } from "@/lib/bookings/confirm-paid-booking";
import {
  findCatalogServiceByName,
  parseBookingNotificationMessage,
} from "@/lib/bookings/recovery-catalog-lookup";
import {
  getBookingById,
  getBookingByNumber,
  upsertBooking,
} from "@/lib/data-service";
import { calculateAdvanceAmount } from "@/lib/payments/booking-payment";
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
  source: "database" | "notification_id" | "reconstructed" | "not_found";
  storedBookingId?: string;
  notificationTitle?: string;
  notificationMessage?: string;
  razorpayPayment?: Awaited<ReturnType<typeof fetchRazorpayPayment>>;
  razorpayOrder?: Awaited<ReturnType<typeof fetchRazorpayOrder>>;
  warnings: string[];
  canRecover: boolean;
}

function normalizeBookingNumber(value: string): string {
  return value.trim().toUpperCase();
}

function normalizePhone(value?: string): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

async function reconstructMissingBooking(input: {
  bookingNumber: string;
  storedBookingId?: string;
  notificationMessage?: string;
  razorpayPayment?: Awaited<ReturnType<typeof fetchRazorpayPayment>>;
  razorpayOrder?: Awaited<ReturnType<typeof fetchRazorpayOrder>>;
  paidAmount: number;
}): Promise<{ booking: Booking | null; warning?: string }> {
  const parsed = parseBookingNotificationMessage(input.notificationMessage ?? "");
  const email =
    input.razorpayPayment?.email?.toLowerCase().trim() ??
    input.razorpayOrder?.notes.customerEmail?.toLowerCase().trim();
  const phone = normalizePhone(input.razorpayPayment?.contact);

  if (!email) {
    return { booking: null, warning: "Razorpay payment email is required to rebuild the booking." };
  }
  if (phone.length < 10) {
    return {
      booking: null,
      warning: "Razorpay payment phone number is required to rebuild the booking.",
    };
  }

  const service = await findCatalogServiceByName(parsed.serviceName ?? "");
  if (!service) {
    return {
      booking: null,
      warning: `Could not match service "${parsed.serviceName ?? ""}" in catalog.`,
    };
  }

  const totalFromNotes = Number(input.razorpayOrder?.notes.totalAmount);
  const amount =
    (Number.isFinite(totalFromNotes) && totalFromNotes > 0 ? totalFromNotes : 0) ||
    input.razorpayOrder?.amount ||
    input.paidAmount;
  const now = new Date().toISOString();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 1);

  const booking: Booking = {
    id: input.storedBookingId ?? `bk_${Date.now()}`,
    bookingNumber: input.bookingNumber,
    userId: "guest",
    customerName: parsed.customerName ?? "Guest",
    customerEmail: email,
    customerPhone: phone,
    serviceType: service.serviceType,
    serviceId: service.serviceId,
    serviceName: service.serviceName,
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10),
    guests: 2,
    amount,
    depositAmount: calculateAdvanceAmount(amount),
    paidAmount: 0,
    paymentPlan:
      (input.razorpayOrder?.notes.paymentPlan as Booking["paymentPlan"] | undefined) ??
      "advance",
    status: "pending",
    paymentStatus: "pending",
    aiProcessed: false,
    notes: "[Reconstructed from Razorpay + admin notification]",
    createdAt: now,
    updatedAt: now,
  };

  return { booking };
}

function canRecoverFromLookup(lookup: Omit<BookingRecoveryLookup, "canRecover">): boolean {
  if (lookup.booking) return true;
  if (!lookup.razorpayPayment?.captured && lookup.razorpayPayment?.status !== "authorized") {
    return false;
  }
  return Boolean(
    lookup.razorpayPayment?.email &&
      normalizePhone(lookup.razorpayPayment.contact).length >= 10 &&
      (lookup.notificationMessage || lookup.razorpayOrder?.receipt)
  );
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

  if (!booking && canRecoverFromLookup({
    booking,
    bookingNumber,
    source,
    storedBookingId,
    notificationTitle,
    notificationMessage,
    razorpayPayment,
    razorpayOrder,
    warnings,
  })) {
    warnings.push(
      "Booking can be rebuilt from Razorpay payment + notification, then confirmed."
    );
  }

  const canRecover = canRecoverFromLookup({
    booking,
    bookingNumber,
    source,
    storedBookingId,
    notificationTitle,
    notificationMessage,
    razorpayPayment,
    razorpayOrder,
    warnings,
  });

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
    canRecover,
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

  let booking = lookup.booking;
  let paidAmount = input.paidAmount;

  if (!booking) {
    if (!lookup.canRecover) {
      return {
        ok: false as const,
        error:
          lookup.warnings[0] ??
          "Booking not found. Add Razorpay Payment ID and preview again.",
        lookup,
      };
    }

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
        error: "Paid amount is required to rebuild this booking.",
        lookup,
      };
    }

    const rebuilt = await reconstructMissingBooking({
      bookingNumber: lookup.bookingNumber,
      storedBookingId: lookup.storedBookingId,
      notificationMessage: lookup.notificationMessage,
      razorpayPayment: lookup.razorpayPayment,
      razorpayOrder: lookup.razorpayOrder,
      paidAmount,
    });

    if (!rebuilt.booking) {
      return {
        ok: false as const,
        error: rebuilt.warning ?? "Could not rebuild booking record.",
        lookup,
      };
    }

    const saved = await upsertBooking(rebuilt.booking);
    booking = saved ?? rebuilt.booking;
    lookup.source = "reconstructed";
    lookup.booking = booking;
  }

  if (!booking) {
    return {
      ok: false as const,
      error: "Booking not found.",
      lookup,
    };
  }

  if (booking.status === "confirmed" && booking.paymentStatus === "paid") {
    return {
      ok: false as const,
      error: `Booking ${booking.bookingNumber} is already confirmed and paid.`,
      lookup,
    };
  }

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
