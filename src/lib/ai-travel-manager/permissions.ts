import type { UserRole } from "@/types";
import type { AIApprovalStatus, DraftEntityType } from "./types";

export function canAccessAITravelManager(role: UserRole): boolean {
  return ["super_admin", "manager", "sales_agent"].includes(role);
}

export function canConfigureAI(role: UserRole): boolean {
  return role === "super_admin";
}

export function canAnalyzeCompetitors(role: UserRole): boolean {
  return role === "super_admin";
}

export function canGenerateAIContent(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}

export function canReviewDrafts(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}

export function canRecommendApproval(role: UserRole): boolean {
  return role === "manager";
}

export function canApproveAIContent(role: UserRole): boolean {
  return role === "super_admin";
}

export function canViewAIDrafts(role: UserRole): boolean {
  return ["super_admin", "manager", "sales_agent"].includes(role);
}

export function canEditAIDraft(role: UserRole, status: AIApprovalStatus): boolean {
  if (role === "super_admin") return status !== "published";
  if (role === "manager") {
    return ["draft", "manager_review", "pending_approval"].includes(status);
  }
  return false;
}

export function canRejectAIDraft(role: UserRole): boolean {
  return role === "super_admin";
}

export function canRegenerateAI(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}

export function canUseAIChatCommands(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}

export function canViewAIAnalytics(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}

export function nextStatusAfterManagerReview(
  current: AIApprovalStatus
): AIApprovalStatus {
  if (current === "draft" || current === "manager_review") {
    return "pending_approval";
  }
  return current;
}

export function assertDraftAction(
  role: UserRole,
  action: "edit" | "recommend" | "approve" | "reject" | "generate" | "analyze"
): void {
  const checks: Record<string, boolean> = {
    edit: canReviewDrafts(role),
    recommend: canRecommendApproval(role),
    approve: canApproveAIContent(role),
    reject: canRejectAIDraft(role),
    generate: canGenerateAIContent(role),
    analyze: canAnalyzeCompetitors(role),
  };
  if (!checks[action]) {
    throw new Error(`Role ${role} cannot perform action: ${action}`);
  }
}

export function getVisibleDraftStatuses(role: UserRole): AIApprovalStatus[] {
  if (role === "super_admin") {
    return ["draft", "manager_review", "pending_approval", "published", "rejected"];
  }
  if (role === "manager") {
    return ["draft", "manager_review", "pending_approval", "published", "rejected"];
  }
  if (role === "sales_agent") {
    return ["published", "pending_approval"];
  }
  return ["published"];
}

export function entityLabel(type: DraftEntityType): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
