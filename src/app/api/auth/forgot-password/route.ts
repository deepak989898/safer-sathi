import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { deliverPasswordResetEmail } from "@/lib/email/password-reset-mail";
import { isResendConfigured } from "@/lib/email/resend";
import { isSmtpConfigured } from "@/lib/email/smtp";
import {
  generatePasswordResetLinkRest,
  isFirebaseAuthRestAvailable,
  lookupAuthUserByEmail,
  sendFirebasePasswordResetEmailRest,
} from "@/lib/firebase/auth-rest-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody<{ email?: string }>(request);
    if (parsed.error) return parsed.error;

    const email = parsed.data?.email?.trim().toLowerCase() ?? "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError("Please enter a valid email address.", 400);
    }

    if (!isFirebaseAuthRestAvailable()) {
      return apiSuccess({
        sent: false,
        delivery: "firebase_client_fallback",
        message: "Firebase Admin credentials are not configured on the server.",
      });
    }

    const authUser = await lookupAuthUserByEmail(email);
    if (!authUser) {
      return apiSuccess({
        sent: true,
        delivery: "none",
        message:
          "If an account exists for this email, a password reset link will be sent.",
      });
    }

    const hasCustomEmail = isResendConfigured() || isSmtpConfigured();

    if (hasCustomEmail) {
      const linkResult = await generatePasswordResetLinkRest(email);
      if (linkResult.ok) {
        try {
          const result = await deliverPasswordResetEmail({
            to: email,
            resetLink: linkResult.link,
          });
          if (result.delivery !== "none") {
            return apiSuccess({
              sent: true,
              delivery: result.delivery,
              detail: result.detail,
              message: "Password reset email sent.",
            });
          }
        } catch (deliveryError) {
          console.error("Password reset Resend/SMTP delivery error:", deliveryError);
          const detail =
            deliveryError instanceof Error ? deliveryError.message : String(deliveryError);
          return apiError(
            `Email delivery failed: ${detail}. Check RESEND_API_KEY or SMTP settings on Vercel.`,
            502
          );
        }
      }

      console.warn(
        "Custom password reset email failed, trying Firebase email:",
        linkResult.ok ? "delivery failed" : linkResult.error
      );
    }

    const firebaseEmail = await sendFirebasePasswordResetEmailRest(email);
    if (firebaseEmail.ok) {
      return apiSuccess({
        sent: true,
        delivery: "firebase_oob",
        message: "Password reset email sent via Firebase.",
      });
    }

    console.error("Firebase password reset email failed:", firebaseEmail.error);

    return apiSuccess({
      sent: false,
      delivery: "firebase_client_fallback",
      message: firebaseEmail.error,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return apiError(`Password reset failed: ${detail}`, 500);
  }
}
