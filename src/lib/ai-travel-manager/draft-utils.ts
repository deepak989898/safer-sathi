import type { AIApprovalStatus, AIPackageDraft } from "./types";

export function resolveApprovalStatus(item: {
  approvalStatus?: AIApprovalStatus;
  publishStatus?: string;
}): AIApprovalStatus {
  if (item.approvalStatus) return item.approvalStatus;
  if (item.publishStatus === "published") return "published";
  if (item.publishStatus === "pending_approval") return "pending_approval";
  if (item.publishStatus === "rejected") return "rejected";
  return "draft";
}

export function normalizePackageDraft(
  pkg: AIPackageDraft
): AIPackageDraft {
  return {
    ...pkg,
    approvalStatus: resolveApprovalStatus(pkg),
    publishStatus: pkg.publishStatus ?? "draft",
    seoSlug: pkg.seoSlug ?? pkg.slug,
    termsAndConditions: pkg.termsAndConditions ?? { en: "", hi: "" },
    cancellationPolicy: pkg.cancellationPolicy ?? { en: "", hi: "" },
    faqs: pkg.faqs ?? [],
    tourHighlights: pkg.tourHighlights ?? [],
    bestSeason: pkg.bestSeason ?? { en: "", hi: "" },
    tags: pkg.tags ?? [],
  };
}
