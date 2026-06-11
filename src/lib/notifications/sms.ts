export interface SMSPayload {
  to: string;
  message: string;
  senderId?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  demo?: boolean;
  error?: string;
}

export function isSMSConfigured(): boolean {
  return Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY);
}

export async function sendSMS(payload: SMSPayload): Promise<NotificationResult> {
  const apiUrl = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;

  if (!apiUrl || !apiKey) {
    console.info("[SMS Demo]", { to: payload.to, message: payload.message.slice(0, 80) });
    return {
      success: true,
      messageId: `demo_sms_${Date.now()}`,
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
        to: payload.to,
        message: payload.message,
        sender_id: payload.senderId ?? process.env.SMS_SENDER_ID ?? "SAFARS",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `SMS API error: ${response.status} ${errorText}` };
    }

    const data = (await response.json()) as { messageId?: string; id?: string };
    return {
      success: true,
      messageId: data.messageId ?? data.id ?? `sms_${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send SMS",
    };
  }
}
