import type { AiCenterSettings } from "@/lib/ai-center/types";

/** Fields persisted via PUT /api/admin/ai-center/settings */
export function buildAiCenterSettingsPayload(
  settings: AiCenterSettings
): Partial<AiCenterSettings> {
  return {
    blogWordLimit: settings.blogWordLimit,
    keywordsPerDay: settings.keywordsPerDay,
    autoDraftEnabled: settings.autoDraftEnabled,
    autoPublishEnabled: settings.autoPublishEnabled,
    autoBlogGenerateEnabled: settings.autoBlogGenerateEnabled,
    autoKeywordApproveEnabled: settings.autoKeywordApproveEnabled,
    autoBlogApproveEnabled: settings.autoBlogApproveEnabled,
    approvalRequired: true,
    packageAutoDraftEnabled: settings.packageAutoDraftEnabled,
    packageApprovalRequired: settings.packageApprovalRequired,
    defaultPackageDuration: settings.defaultPackageDuration,
    defaultMarginPercent: settings.defaultMarginPercent,
    voiceDefaultLocale: settings.voiceDefaultLocale,
    voiceGender: settings.voiceGender,
    voiceAutoDetectLanguage: settings.voiceAutoDetectLanguage,
    analyticsAutoReport: settings.analyticsAutoReport,
    dynamicPricingEnabled: settings.dynamicPricingEnabled,
    reviewAgentEnabled: settings.reviewAgentEnabled,
    leadScoringEnabled: settings.leadScoringEnabled,
    fraudDetectionEnabled: settings.fraudDetectionEnabled,
    priceApprovalRequired: settings.priceApprovalRequired,
    reviewApprovalRequired: settings.reviewApprovalRequired,
    manualPriceOverride: settings.manualPriceOverride,
    fraudRiskThreshold: settings.fraudRiskThreshold,
    leadHotThreshold: settings.leadHotThreshold,
    leadWarmThreshold: settings.leadWarmThreshold,
    phase3NotificationsEnabled: settings.phase3NotificationsEnabled,
    openAiImagesEnabled: settings.openAiImagesEnabled,
    openAiImagesDefaultToggle: settings.openAiImagesDefaultToggle,
    openAiImagesMaxPerBlog: 1,
    openAiImagesMonthlyLimit: settings.openAiImagesMonthlyLimit,
  };
}

export function parseSettingsApiError(json: {
  error?: string;
  details?: { fieldErrors?: Record<string, string[]> };
}): string {
  const fieldErrors = json.details?.fieldErrors;
  if (fieldErrors) {
    const [field, messages] = Object.entries(fieldErrors)[0] ?? [];
    if (field && messages?.length) {
      return `${json.error ?? "Save failed"} (${field}: ${messages.join(", ")})`;
    }
  }
  return json.error ?? "Save failed";
}
