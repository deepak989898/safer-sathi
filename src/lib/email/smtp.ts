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
  return from ? `Safar Sathi <${from}>` : "Safar Sathi <support@thesafarsathi.com>";
}

function getSmtpHosts(): string[] {
  const configured = process.env.SMTP_HOST?.trim();
  const fallbacks = ["smtpout.secureserver.net", "smtp.secureserver.net"];
  if (!configured) return fallbacks;
  return [configured, ...fallbacks.filter((host) => host !== configured)];
}

function getSmtpPort(): number {
  return Number(process.env.SMTP_PORT || 465);
}

function isSecurePort(port: number): boolean {
  const mode = (process.env.SMTP_SECURE || "ssl").toLowerCase();
  if (mode === "starttls" || mode === "tls") return false;
  return port === 465 || mode === "ssl" || mode === "true";
}

export function createSmtpTransport(host?: string) {
  const port = getSmtpPort();
  const secure = isSecurePort(port);
  const mode = (process.env.SMTP_SECURE || "ssl").toLowerCase();
  const requireTLS = mode === "starttls" || mode === "tls";

  return nodemailer.createTransport({
    host: host ?? process.env.SMTP_HOST!.trim(),
    port,
    secure,
    requireTLS,
    auth: {
      user: process.env.SMTP_USER!.trim(),
      pass: process.env.SMTP_PASS!.trim(),
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 20_000,
    tls: {
      minVersion: "TLSv1.2",
    },
  });
}

export async function sendViaSmtp(mail: {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ host: string }> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured on the server.");
  }

  const hosts = getSmtpHosts();
  let lastError: Error | undefined;

  for (const host of hosts) {
    try {
      const transport = createSmtpTransport(host);
      await transport.sendMail({
        from: mail.from,
        to: mail.to,
        replyTo: mail.replyTo,
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      });
      return { host };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`SMTP failed via ${host}:`, lastError.message);
    }
  }

  throw lastError ?? new Error("SMTP send failed on all configured hosts.");
}
