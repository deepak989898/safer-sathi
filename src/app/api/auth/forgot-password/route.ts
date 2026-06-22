import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { sendPasswordResetMail } from "@/lib/email/password-reset-mail";
import { isSmtpConfigured } from "@/lib/email/smtp";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase/admin";
import { appUrl } from "@/lib/site-config";

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody<{ email?: string }>(request);
    if (parsed.error) return parsed.error;

    const email = parsed.data?.email?.trim().toLowerCase() ?? "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError("Please enter a valid email address.", 400);
    }

    if (!isAdminConfigured()) {
      return apiSuccess({
        sent: false,
        delivery: "firebase_client_fallback",
        message: "Use Firebase client delivery.",
      });
    }

    const auth = getAdminAuth();
    let userExists = false;
    try {
      await auth.getUserByEmail(email);
      userExists = true;
    } catch {
      userExists = false;
    }

    if (!userExists) {
      return apiSuccess({
        sent: true,
        message: "If an account exists for this email, a reset link will be sent.",
      });
    }

    const resetLink = await auth.generatePasswordResetLink(email, {
      url: appUrl("/login?reset=done"),
      handleCodeInApp: false,
    });

    if (!isSmtpConfigured()) {
      return apiSuccess({
        sent: false,
        delivery: "firebase_client_fallback",
        message: "SMTP not configured — client will use Firebase email.",
      });
    }

    try {
      await sendPasswordResetMail({ to: email, resetLink });
      return apiSuccess({
        sent: true,
        delivery: "smtp",
        message: "Password reset email sent.",
      });
    } catch (smtpError) {
      console.error("Password reset SMTP error:", smtpError);
      return apiError(
        "Could not deliver the reset email. Please verify SMTP settings or contact support@thesafarsathi.com.",
        502
      );
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    return apiError("Failed to process password reset request.", 500);
  }
}
