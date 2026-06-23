import { appUrl } from "@/lib/site-config";
import { createAuditLog } from "./audit-log";
import { generateInvoice } from "@/lib/documents/invoice";
import { sendEmail } from "@/lib/notifications/email";
import { sendWhatsApp } from "@/lib/notifications/whatsapp";
import { getBookingById, updateBooking } from "@/lib/data-service";
import type { Booking } from "@/types";

export type WorkflowAction =
  | "invoice"
  | "whatsapp"
  | "email"
  | "crm_update"
  | "payment_reminder";

export interface WorkflowStepConfig {
  action: WorkflowAction;
  params?: Record<string, unknown>;
}

export interface WorkflowInput {
  name: string;
  trigger: string;
  bookingId?: string;
  steps: WorkflowStepConfig[];
  actorId?: string;
}

export interface WorkflowStepResult {
  action: WorkflowAction;
  status: "completed" | "failed" | "skipped";
  detail: string;
  output?: Record<string, unknown>;
}

export interface WorkflowResult {
  workflowId: string;
  name: string;
  status: "completed" | "partial" | "failed";
  steps: WorkflowStepResult[];
}

async function executeStep(
  step: WorkflowStepConfig,
  booking?: Booking | null
): Promise<WorkflowStepResult> {
  try {
    switch (step.action) {
      case "invoice": {
        if (!booking) {
          return { action: step.action, status: "skipped", detail: "No booking provided" };
        }
        const pdf = await generateInvoice(booking);
        return {
          action: step.action,
          status: "completed",
          detail: `Invoice generated for ${booking.bookingNumber}`,
          output: { sizeBytes: pdf.length, bookingNumber: booking.bookingNumber },
        };
      }

      case "whatsapp": {
        if (!booking) {
          return { action: step.action, status: "skipped", detail: "No booking provided" };
        }
        const message =
          (step.params?.message as string) ??
          `Hi ${booking.customerName}! Your Safar Sathi booking ${booking.bookingNumber} is confirmed. Amount: ₹${booking.amount.toLocaleString("en-IN")}.`;
        const result = await sendWhatsApp({ to: booking.customerPhone, message });
        return {
          action: step.action,
          status: result.success ? "completed" : "failed",
          detail: result.success ? "WhatsApp sent" : (result.error ?? "WhatsApp failed"),
          output: { messageId: result.messageId, demo: result.demo },
        };
      }

      case "email": {
        if (!booking) {
          return { action: step.action, status: "skipped", detail: "No booking provided" };
        }
        const subject =
          (step.params?.subject as string) ??
          `Booking Confirmation — ${booking.bookingNumber}`;
        const html =
          (step.params?.html as string) ??
          `<p>Dear ${booking.customerName},</p><p>Your booking <strong>${booking.bookingNumber}</strong> for ${booking.serviceName.en} is confirmed.</p><p>Amount: ₹${booking.amount.toLocaleString("en-IN")}</p><p>— Safar Sathi</p>`;
        const result = await sendEmail({
          to: booking.customerEmail,
          subject,
          html,
        });
        return {
          action: step.action,
          status: result.success ? "completed" : "failed",
          detail: result.success ? "Email sent" : (result.error ?? "Email failed"),
          output: { messageId: result.messageId, demo: result.demo },
        };
      }

      case "crm_update": {
        if (!booking) {
          return { action: step.action, status: "skipped", detail: "No booking provided" };
        }
        const crmStatus = (step.params?.status as string) ?? "confirmed";
        await updateBooking(booking.id, {
          status: crmStatus as Booking["status"],
          updatedAt: new Date().toISOString(),
        });
        return {
          action: step.action,
          status: "completed",
          detail: `CRM updated: status → ${crmStatus}`,
        };
      }

      case "payment_reminder": {
        if (!booking) {
          return { action: step.action, status: "skipped", detail: "No booking provided" };
        }
        const due = booking.amount - booking.paidAmount;
        const result = await sendWhatsApp({
          to: booking.customerPhone,
          message: `Reminder: ₹${due.toLocaleString("en-IN")} pending for booking ${booking.bookingNumber}. Pay at ${appUrl("/booking")}`,
        });
        return {
          action: step.action,
          status: result.success ? "completed" : "failed",
          detail: result.success ? "Payment reminder sent" : (result.error ?? "Reminder failed"),
        };
      }

      default:
        return { action: step.action, status: "skipped", detail: "Unknown action" };
    }
  } catch (error) {
    return {
      action: step.action,
      status: "failed",
      detail: error instanceof Error ? error.message : "Step execution failed",
    };
  }
}

export async function executeWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  const workflowId = `wf_${Date.now()}`;
  const booking = input.bookingId ? await getBookingById(input.bookingId) : null;

  const stepResults: WorkflowStepResult[] = [];
  for (const step of input.steps) {
    const result = await executeStep(step, booking);
    stepResults.push(result);
  }

  const failed = stepResults.filter((s) => s.status === "failed").length;
  const completed = stepResults.filter((s) => s.status === "completed").length;
  const status: WorkflowResult["status"] =
    failed === 0 ? "completed" : completed > 0 ? "partial" : "failed";

  await createAuditLog({
    action: "workflow.executed",
    actorId: input.actorId ?? "system",
    actorRole: "manager",
    resource: "workflow",
    resourceId: workflowId,
    metadata: { name: input.name, trigger: input.trigger, status, steps: stepResults.length },
  });

  return {
    workflowId,
    name: input.name,
    status,
    steps: stepResults,
  };
}
