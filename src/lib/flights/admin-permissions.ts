import type { UserRole } from "@/types";

/** Roles that can open Flight Bookings admin pages. */
export function canViewFlightBookingsAdmin(role: UserRole): boolean {
  return ["super_admin", "manager", "sales_agent", "support_agent"].includes(role);
}

/** Super admin / admin: retry TripJack actions + raw API logs. */
export function canManageFlightBookingsAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

/** Manager: view full booking details, no retry / no raw logs. */
export function canViewFlightBookingFullDetails(role: UserRole): boolean {
  return role === "super_admin" || role === "manager";
}

/** Sales agent: basic booking details only. */
export function canViewFlightBookingBasicOnly(role: UserRole): boolean {
  return role === "sales_agent";
}
