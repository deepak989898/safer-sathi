import { SITE_CONTACT } from "@/lib/site-config";

export const contactLinks = {
  phone: `tel:${SITE_CONTACT.phoneTel}`,
  email: `mailto:${SITE_CONTACT.email}`,
  whatsapp: SITE_CONTACT.whatsappUrl,
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE_CONTACT.addressFull)}`,
} as const;

/** Opens WhatsApp chat with optional pre-filled message (mobile app or web). */
export function whatsAppUrl(message?: string): string {
  if (!message?.trim()) return SITE_CONTACT.whatsappUrl;
  return `${SITE_CONTACT.whatsappUrl}?text=${encodeURIComponent(message.trim())}`;
}

export const DEFAULT_WHATSAPP_GREETING =
  "Hello Safar Sathi, I would like to inquire about your travel services.";
