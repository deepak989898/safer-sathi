import { demoBookings } from "@/data/demo-data";
import { routeCompletion, type AIProvider } from "../router";
import type { ChatMessage } from "../openai";

const SYSTEM_PROMPT = `You are Safar Sathi AI Support Agent. Answer customer queries about bookings,
payments, cancellations, and travel services. Be empathetic and solution-oriented.
If you cannot resolve the issue, recommend human escalation.`;

const FAQ: Record<string, { answer: string; confidence: number }> = {
  cancel: {
    answer:
      "Cancellations made 7+ days before travel receive a full refund minus processing fees. Within 7 days, 50% refund applies. Contact support@safarsathi.com with your booking number.",
    confidence: 0.92,
  },
  refund: {
    answer:
      "Refunds are processed within 5-7 business days to the original payment method. Partial payments are refunded proportionally.",
    confidence: 0.9,
  },
  payment: {
    answer:
      "We accept UPI, cards, net banking via Razorpay. You can pay full amount or 20% deposit to confirm booking.",
    confidence: 0.95,
  },
  booking: {
    answer:
      "Track your booking in My Bookings or share your booking number (e.g. SS-2025-001234) for status updates.",
    confidence: 0.88,
  },
  contact: {
    answer:
      "Reach us at support@safarsathi.com, WhatsApp +91-9876543210, or call 1800-SAFAR-SATHI (24/7).",
    confidence: 0.97,
  },
};

export interface SupportAgentInput {
  query: string;
  bookingNumber?: string;
  locale?: "en" | "hi";
  history?: ChatMessage[];
}

export interface SupportAgentResult {
  answer: string;
  confidence: number;
  provider: AIProvider;
  escalate: boolean;
  relatedBooking?: string;
}

function ruleBasedSupport(query: string, bookingNumber?: string): { answer: string; confidence: number } {
  const q = query.toLowerCase();

  if (bookingNumber) {
    const booking = demoBookings.find((b) => b.bookingNumber === bookingNumber);
    if (booking) {
      return {
        answer: `Booking ${booking.bookingNumber} for ${booking.serviceName.en} is ${booking.status} with payment status ${booking.paymentStatus}. Amount: ₹${booking.amount.toLocaleString("en-IN")}.`,
        confidence: 0.94,
      };
    }
    return {
      answer: `I couldn't find booking ${bookingNumber}. Please verify the number or contact support@safarsathi.com.`,
      confidence: 0.7,
    };
  }

  for (const [key, entry] of Object.entries(FAQ)) {
    if (q.includes(key)) return entry;
  }

  if (q.includes("रद्द") || q.includes("cancel")) return FAQ.cancel;
  if (q.includes("भुगतान") || q.includes("pay")) return FAQ.payment;
  if (q.includes("बुकिंग") || q.includes("status")) return FAQ.booking;

  return {
    answer:
      "Thank you for contacting Safar Sathi. I can help with bookings, payments, cancellations, and refunds. Could you share more details or your booking number?",
    confidence: 0.55,
  };
}

export async function runSupportAgent(input: SupportAgentInput): Promise<SupportAgentResult> {
  const messages: ChatMessage[] = [
    ...(input.history ?? []),
    {
      role: "user",
      content: input.bookingNumber
        ? `${input.query} (Booking: ${input.bookingNumber})`
        : input.query,
    },
  ];

  const fallback = ruleBasedSupport(input.query, input.bookingNumber);
  const { content, provider } = await routeCompletion(SYSTEM_PROMPT, messages, () => fallback.answer);

  const confidence =
    provider === "rule-based"
      ? fallback.confidence
      : Math.min(0.85, fallback.confidence + 0.1);

  return {
    answer: content,
    confidence,
    provider,
    escalate: confidence < 0.7,
    relatedBooking: input.bookingNumber,
  };
}
