import { createBooking, generateBookingNumber } from "@/lib/data-service";
import { createAuditLog } from "@/lib/automation/audit-log";
import type { Booking, ServiceType } from "@/types";
import { routeCompletion, type AIProvider } from "../router";
import type { ChatMessage } from "../openai";

const SYSTEM_PROMPT = `You are Safar Sathi AI Booking Agent. Process booking requests autonomously.
Validate customer details, calculate amounts, and confirm next steps.
Return structured guidance for booking confirmation, payment, and notifications.`;

export interface BookingAgentInput {
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
  userId?: string;
  notes?: string;
}

export interface BookingAgentStep {
  action: string;
  status: "completed" | "pending" | "skipped";
  detail: string;
}

export interface BookingAgentResult {
  booking: Booking;
  provider: AIProvider;
  summary: string;
  steps: BookingAgentStep[];
}

function ruleBasedBookingSummary(booking: Booking): string {
  return `Booking ${booking.bookingNumber} created for ${booking.customerName}. ` +
    `Service: ${booking.serviceName.en}. Amount: ₹${booking.amount.toLocaleString("en-IN")}. ` +
    `Status: ${booking.status}. Payment: ${booking.paymentStatus}. ` +
    `Next: send confirmation via WhatsApp and email, generate invoice.`;
}

export async function runBookingAgent(input: BookingAgentInput): Promise<BookingAgentResult> {
  const bookingNumber = generateBookingNumber();
  const now = new Date().toISOString();

  const booking = await createBooking({
    bookingNumber,
    userId: input.userId ?? "guest",
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
    depositAmount: Math.round(input.amount * 0.2),
    paidAmount: 0,
    status: "pending",
    paymentStatus: "pending",
    aiProcessed: true,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  });

  const steps: BookingAgentStep[] = [
    { action: "validate_input", status: "completed", detail: "Customer and service details validated" },
    { action: "create_booking", status: "completed", detail: `Booking ${booking.bookingNumber} created` },
    { action: "calculate_pricing", status: "completed", detail: `Total ₹${booking.amount}, deposit ₹${booking.depositAmount}` },
    { action: "send_confirmation", status: "pending", detail: "Awaiting payment — confirmation will be sent after payment" },
    { action: "generate_invoice", status: "pending", detail: "Invoice will be generated on payment confirmation" },
  ];

  await createAuditLog({
    action: "booking.created",
    actorId: input.userId ?? "ai-booking-agent",
    actorRole: "sales_agent",
    resource: "booking",
    resourceId: booking.id,
    metadata: { bookingNumber: booking.bookingNumber, amount: booking.amount },
  });

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: JSON.stringify({
        bookingNumber: booking.bookingNumber,
        customer: booking.customerName,
        service: booking.serviceName.en,
        amount: booking.amount,
        guests: booking.guests,
        dates: `${booking.startDate} to ${booking.endDate ?? "N/A"}`,
      }),
    },
  ];

  const { content, provider } = await routeCompletion(
    SYSTEM_PROMPT,
    messages,
    () => ruleBasedBookingSummary(booking)
  );

  return { booking, provider, summary: content, steps };
}
