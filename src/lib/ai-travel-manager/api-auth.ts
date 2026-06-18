import { z } from "zod";
import { apiError } from "@/lib/api-response";
import type { UserRole } from "@/types";
import {
  canAccessAITravelManager,
  canAnalyzeCompetitors,
  canApproveAIContent,
  canGenerateAIContent,
  canRecommendApproval,
  canRejectAIDraft,
  canReviewDrafts,
  canUseAIChatCommands,
} from "./permissions";

export const actorRoleSchema = z.enum([
  "super_admin",
  "manager",
  "sales_agent",
  "support_agent",
  "driver",
  "customer",
]);

export function requireRole(
  role: UserRole,
  check: (r: UserRole) => boolean,
  message: string
) {
  if (!check(role)) {
    return apiError(message, 403);
  }
  return null;
}

export function requireAITravelManagerAccess(role: UserRole) {
  return requireRole(
    role,
    canAccessAITravelManager,
    "You do not have access to AI Travel Manager"
  );
}

export function requireAnalyze(role: UserRole) {
  return requireRole(
    role,
    canAnalyzeCompetitors,
    "Only super admin can analyze competitor websites"
  );
}

export function requireGenerate(role: UserRole) {
  return requireRole(
    role,
    canGenerateAIContent,
    "Only super admin and manager can generate AI content"
  );
}

export function requireReview(role: UserRole) {
  return requireRole(
    role,
    canReviewDrafts,
    "Only super admin and manager can review drafts"
  );
}

export function requireRecommend(role: UserRole) {
  return requireRole(
    role,
    canRecommendApproval,
    "Only managers can recommend approval"
  );
}

export function requireApprove(role: UserRole) {
  return requireRole(
    role,
    canApproveAIContent,
    "Only super admin can approve and publish"
  );
}

export function requireReject(role: UserRole) {
  return requireRole(
    role,
    canRejectAIDraft,
    "Only super admin can reject drafts"
  );
}

export function requireChat(role: UserRole) {
  return requireRole(
    role,
    canUseAIChatCommands,
    "Only super admin and manager can use AI chat commands"
  );
}
