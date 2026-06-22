import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { deliverPasswordResetEmail } from "@/lib/email/password-reset-mail";
import { isResendConfigured } from "@/lib/email/resend";
import { isSmtpConfigured } from "@/lib/email/smtp";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase/admin";
import { appUrl } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function generateResetLink(email: string): Promise<string> {
  const auth = getAdminAuth();
  const candidates = [
    appUrl("/login?reset=done"),
    "https://www.thesafarsathi.com/login?reset=done",
    "https://safar-sathi-tour-booking.firebaseapp.com/login?reset=done",
  ];

  let lastError: unknown;
  for (const url of [...new Set(candidates)]) {
    try {
      return await auth.generatePasswordResetLink(email, {
        url,
        handleCodeInApp: false,
      });
    } catch (error) {
      lastError = error;
      console.error(`generatePasswordResetLink failed for ${url}:`, error);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Could not generate password reset link.");
}

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
        message: "Firebase Admin not configured on server.",
      });
    }

    let userExists = false;
    try {
      await getAdminAuth().getUserByEmail(email);
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

    const resetLink = await generateResetLink(email);

    if (!isResendConfigured() && !isSmtpConfigured()) {
      return apiSuccess({
        sent: false,
        delivery: "firebase_client_fallback",
        message: "No server email provider configured.",
      });
    }

    try {
      const result = await deliverPasswordResetEmail({ to: email, resetLink });
      if (result.delivery === "none") {
        return apiSuccess({
          sent: false,
          delivery: "firebase_client_fallback",
          message: "No server email provider configured.",
        });
      }

      return apiSuccess({
        sent: true,
        delivery: result.delivery,
        detail: result.detail,
        message: "Password reset email sent.",
      });
    } catch (deliveryError) {
      console.error("Password reset delivery error:", deliveryError);
      const detail =
        deliveryError instanceof Error ? deliveryError.message : String(deliveryError);
      return apiError(
        `Email delivery failed: ${detail}. Add RESEND_API_KEY on Vercel (recommended) or verify GoDaddy SMTP.`,
        502
      );
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return apiError(`Password reset failed: ${detail}`, 500);
  }
}
