"use client";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

export interface RazorpayCheckoutInput {
  keyId?: string | null;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  demo?: boolean;
}

export interface RazorpayCheckoutResult {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  input: RazorpayCheckoutInput
): Promise<RazorpayCheckoutResult> {
  if (input.demo || !input.keyId) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return {
      razorpayOrderId: input.orderId,
      razorpayPaymentId: `demo_pay_${Date.now()}`,
      razorpaySignature: "demo_signature",
    };
  }

  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error("Unable to load Razorpay checkout. Please try again.");
  }

  return new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay!({
      key: input.keyId,
      amount: input.amount,
      currency: input.currency,
      name: input.name,
      description: input.description,
      order_id: input.orderId,
      prefill: {
        name: input.customerName,
        email: input.customerEmail,
        contact: input.customerPhone,
      },
      theme: {
        color: "#2563eb",
      },
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled")),
      },
    });

    razorpay.on("payment.failed", () => {
      reject(new Error("Payment failed. Please try again."));
    });

    razorpay.open();
  });
}

export function getPublicRazorpayKeyId(): string | null {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null;
}

export function isDemoPaymentMode(keyId?: string | null, demo?: boolean): boolean {
  return Boolean(demo) || !keyId;
}
