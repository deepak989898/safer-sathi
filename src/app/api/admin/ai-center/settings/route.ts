import { requireAICenterAuth } from "@/lib/ai-center/api-auth";
import {
  getAiCenterSettings,
  hydrateAiCenterStore,
  updateAiCenterSettings,
} from "@/lib/ai-center/repository";
import type { AiCenterSettings } from "@/lib/ai-center/types";
import { apiError, apiSuccess, parseJsonBody } from "@/lib/api-response";
import { z } from "zod";

export async function GET(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    await hydrateAiCenterStore();
    return apiSuccess(getAiCenterSettings());
  } catch (err) {
    return apiError("Failed to load settings", 500);
  }
}

const settingsSchema = z.object({
  blogWordLimit: z.coerce
    .number()
    .refine((n) => [1000, 1500, 2000, 3000].includes(n), "Must be 1000, 1500, 2000, or 3000")
    .optional(),
  keywordsPerDay: z.coerce.number().int().min(1).max(100).optional(),
  autoDraftEnabled: z.boolean().optional(),
  autoPublishEnabled: z.boolean().optional(),
  autoBlogGenerateEnabled: z.boolean().optional(),
  autoKeywordApproveEnabled: z.boolean().optional(),
  autoBlogApproveEnabled: z.boolean().optional(),
  approvalRequired: z.boolean().optional(),
  packageAutoDraftEnabled: z.boolean().optional(),
  packageApprovalRequired: z.boolean().optional(),
  defaultPackageDuration: z.coerce.number().min(2).max(14).optional(),
  defaultMarginPercent: z.coerce.number().min(5).max(40).optional(),
  voiceDefaultLocale: z.enum(["en", "hi", "auto"]).optional(),
  voiceGender: z.enum(["male", "female"]).optional(),
  voiceAutoDetectLanguage: z.boolean().optional(),
  analyticsAutoReport: z.boolean().optional(),
  dynamicPricingEnabled: z.boolean().optional(),
  reviewAgentEnabled: z.boolean().optional(),
  leadScoringEnabled: z.boolean().optional(),
  fraudDetectionEnabled: z.boolean().optional(),
  priceApprovalRequired: z.boolean().optional(),
  reviewApprovalRequired: z.boolean().optional(),
  manualPriceOverride: z.boolean().optional(),
  fraudRiskThreshold: z.coerce.number().min(0).max(100).optional(),
  leadHotThreshold: z.coerce.number().min(0).max(100).optional(),
  leadWarmThreshold: z.coerce.number().min(0).max(100).optional(),
  phase3NotificationsEnabled: z.boolean().optional(),
  openAiImagesEnabled: z.boolean().optional(),
  openAiImagesDefaultToggle: z.boolean().optional(),
  openAiImagesMaxPerBlog: z.coerce.number().int().min(1).max(1).optional(),
  openAiImagesMonthlyLimit: z.coerce.number().int().min(1).max(10000).optional(),
});

function formatSettingsValidationError(error: z.ZodError): string {
  const flat = error.flatten();
  const entry = Object.entries(flat.fieldErrors)[0];
  if (entry) {
    const [field, messages] = entry;
    if (Array.isArray(messages) && messages.length) {
      return `Validation failed — ${field}: ${messages.join(", ")}`;
    }
  }
  return flat.formErrors[0] ?? "Validation failed";
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAICenterAuth(request);
    if ("error" in auth) return auth.error;

    const { data: body, error } = await parseJsonBody(request);
    if (error) return error;

    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(formatSettingsValidationError(parsed.error), 400, parsed.error.flatten());
    }

    const updates = { ...parsed.data };
    if (updates.autoPublishEnabled && updates.approvalRequired === false) {
      return apiError("Approval is always required before publishing", 400);
    }
    if (updates.approvalRequired === false) {
      updates.approvalRequired = true;
    }

    await hydrateAiCenterStore();
    const settings = await updateAiCenterSettings(
      updates as Partial<AiCenterSettings>,
      auth.user.id
    );
    return apiSuccess(settings);
  } catch (err) {
    return apiError("Failed to update settings", 500);
  }
}
