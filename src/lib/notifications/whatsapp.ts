export interface WhatsAppPayload {
  to: string;
  message: string;
  templateName?: string;
  templateParams?: string[];
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  demo?: boolean;
  error?: string;
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_WEBHOOK_URL);
}

export async function sendWhatsApp(payload: WhatsAppPayload): Promise<NotificationResult> {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  const apiKey = process.env.WHATSAPP_API_KEY;

  if (!webhookUrl) {
    console.info("[WhatsApp Demo]", { to: payload.to, message: payload.message.slice(0, 80) });
    return {
      success: true,
      messageId: `demo_wa_${Date.now()}`,
      demo: true,
    };
  }

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: payload.to,
        message: payload.message,
        template: payload.templateName,
        params: payload.templateParams,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `WhatsApp API error: ${response.status} ${errorText}` };
    }

    const data = (await response.json()) as { messageId?: string; id?: string };
    return {
      success: true,
      messageId: data.messageId ?? data.id ?? `wa_${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send WhatsApp message",
    };
  }
}
