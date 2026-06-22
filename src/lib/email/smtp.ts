import nodemailer from "nodemailer";

export function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
}

export function getSmtpFromAddress(): string {
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
  return from ? `Safar Sathi <${from}>` : "Safar Sathi <noreply@thesafarsathi.com>";
}

export function createSmtpTransport() {
  const host = process.env.SMTP_HOST!.trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const mode = (process.env.SMTP_SECURE || "ssl").toLowerCase();

  const secure = mode === "ssl" || mode === "true";
  const requireTLS = mode === "starttls" || mode === "tls";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!.trim(),
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
  });
}
