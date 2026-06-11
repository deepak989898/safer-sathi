import { z } from "zod";
import { sendEmail } from "@/lib/notifications/email";
import { sendSMS } from "@/lib/notifications/sms";
import { sendWhatsApp } from "@/lib/notifications/whatsapp";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";

const schema = z.object({
  channel: z.enum(["email", "whatsapp", "sms"]),
  to: z.string().min(1),
  subject: z.string().optional(),
  message: z.string().min(1),
  html: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, parsed.error.flatten());
    }

    const { channel, to, subject, message, html } = parsed.data;

    let result;
    switch (channel) {
      case "email":
        if (!subject) {
          return apiError("Subject is required for email notifications", 400);
        }
        result = await sendEmail({ to, subject, text: message, html });
        break;
      case "whatsapp":
        result = await sendWhatsApp({ to, message });
        break;
      case "sms":
        result = await sendSMS({ to, message });
        break;
    }

    if (!result.success) {
      return apiError(result.error ?? "Notification failed", 500);
    }

    return apiSuccess({
      channel,
      messageId: result.messageId,
      demo: result.demo,
    });
  } catch (err) {
    console.error("Send notification error:", err);
    return apiError("Failed to send notification", 500);
  }
}
