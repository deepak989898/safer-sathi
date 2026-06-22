import {
  createSmtpTransport,
  getSmtpFromAddress,
  isSmtpConfigured,
} from "@/lib/email/smtp";

export async function sendPasswordResetMail(input: {
  to: string;
  resetLink: string;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    throw new Error("SMTP is not configured on the server.");
  }

  const transport = createSmtpTransport();
  const from = getSmtpFromAddress();

  await transport.sendMail({
    from,
    to: input.to,
    replyTo: process.env.SMTP_REPLY_TO?.trim() || process.env.SMTP_USER?.trim(),
    subject: "Reset your Safar Sathi password",
    text: [
      "Hello,",
      "",
      "We received a request to reset your Safar Sathi account password.",
      "",
      `Reset your password: ${input.resetLink}`,
      "",
      "If you did not request this, you can ignore this email.",
      "",
      "— Safar Sathi Team",
      "https://www.thesafarsathi.com",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0c2444;">
        <h2 style="margin:0 0 12px;">Reset your password</h2>
        <p style="color:#475569;line-height:1.6;">
          We received a request to reset your Safar Sathi account password.
          Click the button below to choose a new password.
        </p>
        <p style="margin:28px 0;">
          <a href="${input.resetLink}"
            style="background:#f97316;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;display:inline-block;">
            Reset Password
          </a>
        </p>
        <p style="color:#64748b;font-size:13px;line-height:1.6;">
          Or copy this link:<br />
          <a href="${input.resetLink}" style="color:#2563eb;word-break:break-all;">${input.resetLink}</a>
        </p>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px;">
          If you did not request this, ignore this email. The link expires after a short time.
        </p>
      </div>
    `,
  });
}
