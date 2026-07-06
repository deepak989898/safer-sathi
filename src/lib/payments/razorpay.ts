import Razorpay from "razorpay";
import crypto from "crypto";

export interface CreateOrderInput {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
  demo?: boolean;
}

export interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export function isRazorpayConfigured(): boolean {
  return Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  );
}

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Demo payments are only allowed outside production (or when explicitly enabled). */
export function isDemoPaymentAllowed(): boolean {
  if (isRazorpayConfigured()) return false;
  if (!isProductionEnvironment()) return true;
  return process.env.ALLOW_DEMO_PAYMENTS === "true";
}

export function isDemoPaymentIdentifier(value: string): boolean {
  return value.startsWith("demo_");
}

export function getPaymentGatewayError(): string {
  if (isProductionEnvironment() && !isRazorpayConfigured()) {
    return "Payment gateway is not configured. Please contact support.";
  }
  return "Payment gateway is not available. Please try again later.";
}

function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const currency = input.currency ?? "INR";
  const amountPaise = Math.round(input.amount * 100);

  if (!isRazorpayConfigured()) {
    if (!isDemoPaymentAllowed()) {
      throw new Error(getPaymentGatewayError());
    }
    return {
      orderId: `demo_order_${Date.now()}`,
      amount: amountPaise,
      currency,
      receipt: input.receipt,
      demo: true,
    };
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency,
    receipt: input.receipt,
    notes: input.notes,
  });

  return {
    orderId: order.id,
    amount: Number(order.amount),
    currency: order.currency,
    receipt: order.receipt ?? input.receipt,
  };
}

export function verifyPayment(input: VerifyPaymentInput): boolean {
  if (
    isProductionEnvironment() &&
    (isDemoPaymentIdentifier(input.razorpayOrderId) ||
      isDemoPaymentIdentifier(input.razorpayPaymentId) ||
      input.razorpaySignature === "demo_signature")
  ) {
    return false;
  }

  if (!isRazorpayConfigured()) {
    if (!isDemoPaymentAllowed()) return false;
    return Boolean(input.razorpayOrderId && input.razorpayPaymentId);
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET!;
  const body = `${input.razorpayOrderId}|${input.razorpayPaymentId}`;
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex");

  return expected === input.razorpaySignature;
}

export function getRazorpayKeyId(): string | null {
  return process.env.RAZORPAY_KEY_ID ?? null;
}

export function getPublicRazorpayKeyId(): string | null {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID ?? null;
}

export interface RazorpayPaymentDetails {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: string;
  email?: string;
  contact?: string;
  method?: string;
  captured: boolean;
}

export interface RazorpayOrderDetails {
  id: string;
  receipt: string;
  amount: number;
  amountPaid: number;
  currency: string;
  status: string;
  notes: Record<string, string>;
}

export async function fetchRazorpayPayment(
  paymentId: string
): Promise<RazorpayPaymentDetails | null> {
  if (!isRazorpayConfigured() || isDemoPaymentIdentifier(paymentId)) {
    return null;
  }

  try {
    const razorpay = getRazorpayClient();
    const payment = (await razorpay.payments.fetch(paymentId)) as {
      id: string;
      order_id: string;
      amount: number;
      currency: string;
      status: string;
      email?: string;
      contact?: string;
      method?: string;
      captured?: boolean;
    };

    return {
      id: payment.id,
      orderId: payment.order_id,
      amount: Number(payment.amount) / 100,
      currency: payment.currency,
      status: payment.status,
      email: payment.email,
      contact: payment.contact,
      method: payment.method,
      captured: payment.captured ?? payment.status === "captured",
    };
  } catch (error) {
    console.warn("fetchRazorpayPayment failed:", error);
    return null;
  }
}

export async function fetchCapturedPaymentForOrder(
  orderId: string
): Promise<RazorpayPaymentDetails | null> {
  if (!isRazorpayConfigured() || isDemoPaymentIdentifier(orderId)) {
    return null;
  }

  try {
    const razorpay = getRazorpayClient();
    const payments = (await razorpay.orders.fetchPayments(orderId)) as {
      items?: Array<{ id: string; status: string }>;
    };
    const captured =
      payments.items?.find((item) => item.status === "captured") ?? payments.items?.[0];
    if (!captured?.id) return null;
    return fetchRazorpayPayment(captured.id);
  } catch (error) {
    console.warn("fetchCapturedPaymentForOrder failed:", error);
    return null;
  }
}

export async function fetchRazorpayOrderByReceipt(
  receipt: string
): Promise<RazorpayOrderDetails | null> {
  if (!isRazorpayConfigured()) return null;

  try {
    const razorpay = getRazorpayClient();
    const result = (await razorpay.orders.all({
      receipt: receipt.trim(),
      count: 1,
    })) as { items?: Array<{ id: string }> };

    const orderId = result.items?.[0]?.id;
    if (!orderId) return null;
    return fetchRazorpayOrder(orderId);
  } catch (error) {
    console.warn("fetchRazorpayOrderByReceipt failed:", error);
    return null;
  }
}

export interface CreateRefundInput {
  paymentId: string;
  amount: number;
  notes?: Record<string, string>;
}

export interface CreateRefundResult {
  id: string;
  status: string;
  amount: number;
}

export async function createRazorpayRefund(
  input: CreateRefundInput
): Promise<CreateRefundResult | null> {
  if (!isRazorpayConfigured()) {
    if (isDemoPaymentAllowed() && isDemoPaymentIdentifier(input.paymentId)) {
      return {
        id: `demo_refund_${Date.now()}`,
        status: "processed",
        amount: input.amount,
      };
    }
    return null;
  }

  if (isDemoPaymentIdentifier(input.paymentId)) {
    return {
      id: `demo_refund_${Date.now()}`,
      status: "processed",
      amount: input.amount,
    };
  }

  try {
    const razorpay = getRazorpayClient();
    const refund = (await razorpay.payments.refund(input.paymentId, {
      amount: Math.round(input.amount * 100),
      notes: input.notes,
    })) as { id: string; status?: string; amount?: number };

    return {
      id: refund.id,
      status: refund.status ?? "processed",
      amount: Number(refund.amount ?? Math.round(input.amount * 100)) / 100,
    };
  } catch (error) {
    console.warn("createRazorpayRefund failed:", error);
    return null;
  }
}

export async function fetchRazorpayOrder(
  orderId: string
): Promise<RazorpayOrderDetails | null> {
  if (!isRazorpayConfigured() || isDemoPaymentIdentifier(orderId)) {
    return null;
  }

  try {
    const razorpay = getRazorpayClient();
    const order = (await razorpay.orders.fetch(orderId)) as {
      id: string;
      receipt?: string;
      amount: number;
      amount_paid?: number;
      currency: string;
      status: string;
      notes?: Record<string, string>;
    };

    return {
      id: order.id,
      receipt: order.receipt ?? "",
      amount: Number(order.amount) / 100,
      amountPaid: Number(order.amount_paid ?? 0) / 100,
      currency: order.currency,
      status: order.status,
      notes: order.notes ?? {},
    };
  } catch (error) {
    console.warn("fetchRazorpayOrder failed:", error);
    return null;
  }
}
