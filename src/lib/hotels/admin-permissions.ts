import type { UserRole } from "@/types";

export function canViewHotelBookingsAdmin(role: UserRole): boolean {
  return ["super_admin", "manager", "sales_agent", "support_agent"].includes(role);
}

export function canManageHotelBookingsAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

export function canUpdateHotelRefundStatus(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}

export function canViewHotelBookingFullDetails(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}
