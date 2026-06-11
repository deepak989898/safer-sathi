export interface EmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  demo?: boolean;
  error?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_API_URL && process.env.EMAIL_API_KEY);
}

export async function sendEmail(payload: EmailPayload): Promise<NotificationResult> {
  const apiUrl = process.env.EMAIL_API_URL;
  const apiKey = process.env.EMAIL_API_KEY;
  const from = payload.from ?? process.env.EMAIL_FROM ?? "Safar Sathi <bookings@safarsathi.com>";

  if (!apiUrl || !apiKey) {
    console.info("[Email Demo]", { to: payload.to, subject: payload.subject });
    return {
      success: true,
      messageId: `demo_email_${Date.now()}`,
      demo: true,
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: payload.replyTo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Email API error: ${response.status} ${errorText}` };
    }

    const data = (await response.json()) as { id?: string };
    return { success: true, messageId: data.id ?? `email_${Date.now()}` };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
