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
  if (!isRazorpayConfigured()) {
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
