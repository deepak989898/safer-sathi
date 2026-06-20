import type { UserRole } from "@/types";

export function canAccessAICenter(role: UserRole): boolean {
  return role === "super_admin";
}

export function canManageAICenterKeywords(role: UserRole): boolean {
  return role === "super_admin";
}

export function canManageAICenterBlogs(role: UserRole): boolean {
  return role === "super_admin";
}

export function canPublishAICenterBlog(role: UserRole): boolean {
  return role === "super_admin";
}

export function canConfigureAICenter(role: UserRole): boolean {
  return role === "super_admin";
}

export function canViewAICenterLogs(role: UserRole): boolean {
  return role === "super_admin";
}
