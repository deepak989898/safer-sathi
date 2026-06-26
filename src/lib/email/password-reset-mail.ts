import { isResendConfigured, sendViaResend } from "@/lib/email/resend";
import { getSmtpFromAddress, isSmtpConfigured, sendViaSmtp } from "@/lib/email/smtp";
import { appUrl } from "@/lib/site-config";

export function buildPasswordResetEmail(resetLink: string) {
  const subject = "Reset your Safar Sathi password";
  const site = appUrl();
  const text = [
    "Hello,",
    "",
    "We received a request to reset your Safar Sathi account password.",
    "",
    `Reset your password: ${resetLink}`,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "— Safar Sathi Team",
    site,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0c2444;">
      <h2 style="margin:0 0 12px;">Reset your password</h2>
      <p style="color:#475569;line-height:1.6;">
        We received a request to reset your Safar Sathi account password.
        Click the button below to choose a new password.
      </p>
      <p style="margin:28px 0;">
        <a href="${resetLink}"
          style="background:#f97316;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">
          Reset Password
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;line-height:1.6;">
        Or copy this link:<br />
        <a href="${resetLink}" style="color:#2563eb;word-break:break-all;">${resetLink}</a>
      </p>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
        If you did not request this, ignore this email. The link expires after a short time.
      </p>
    </div>
  `;

  return { subject, text, html };
}

export type PasswordResetDelivery = "resend" | "smtp" | "none";

export async function deliverPasswordResetEmail(input: {
  to: string;
  resetLink: string;
}): Promise<{ delivery: PasswordResetDelivery; detail?: string }> {
  const { subject, text, html } = buildPasswordResetEmail(input.resetLink);

  if (isResendConfigured()) {
    await sendViaResend({ to: input.to, subject, text, html });
    return { delivery: "resend" };
  }

  if (isSmtpConfigured()) {
    const result = await sendViaSmtp({
      from: getSmtpFromAddress(),
      to: input.to,
      replyTo: process.env.SMTP_REPLY_TO?.trim() || process.env.SMTP_USER?.trim(),
      subject,
      text,
      html,
    });
    return { delivery: "smtp", detail: result.host };
  }

  return { delivery: "none" };
}
