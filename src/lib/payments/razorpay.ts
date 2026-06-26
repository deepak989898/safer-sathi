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
