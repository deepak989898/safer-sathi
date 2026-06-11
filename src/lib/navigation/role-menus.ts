import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Building2,
  Bus,
  CalendarCheck,
  Car,
  Cog,
  GitBranch,
  Headphones,
  Home,
  LayoutDashboard,
  Megaphone,
  Package,
  Shield,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface NavMenuItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

export const CUSTOMER_NAV_ITEMS: NavMenuItem[] = [
  { href: "/", label: "home", icon: Home },
  { href: "/packages", label: "packages", icon: Package },
  { href: "/vehicles", label: "vehicles", icon: Car },
  { href: "/hotels", label: "hotels", icon: Building2 },
  { href: "/bus-booking", label: "bus", icon: Bus },
  { href: "/ai-assistant", label: "aiAssistant", icon: Sparkles },
  { href: "/my-bookings", label: "myBookings", icon: CalendarCheck },
];

export const ADMIN_NAV_ITEMS: NavMenuItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "manager", "sales_agent", "support_agent", "driver"],
  },
  {
    href: "/admin/bookings",
    label: "Bookings",
    icon: CalendarCheck,
    roles: ["super_admin", "manager", "sales_agent", "driver"],
  },
  {
    href: "/admin/vehicles",
    label: "Vehicles",
    icon: Car,
    roles: ["super_admin", "manager"],
  },
  {
    href: "/admin/packages",
    label: "Packages",
    icon: Package,
    roles: ["super_admin", "manager"],
  },
  {
    href: "/admin/hotels",
    label: "Hotels",
    icon: Building2,
    roles: ["super_admin", "manager"],
  },
  {
    href: "/admin/ai-agents",
    label: "AI Agents",
    icon: Bot,
    roles: ["super_admin", "manager"],
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["super_admin", "manager"],
  },
  {
    href: "/admin/customers",
    label: "Customers",
    icon: Users,
    roles: ["super_admin", "manager", "sales_agent"],
  },
  {
    href: "/admin/support",
    label: "Support",
    icon: Headphones,
    roles: ["super_admin", "manager", "support_agent"],
  },
  {
    href: "/admin/marketing",
    label: "Marketing",
    icon: Megaphone,
    roles: ["super_admin", "manager"],
  },
  {
    href: "/admin/workflows",
    label: "Workflows",
    icon: GitBranch,
    roles: ["super_admin", "manager"],
  },
  {
    href: "/admin/roles",
    label: "Roles",
    icon: Shield,
    roles: ["super_admin"],
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Cog,
    roles: ["super_admin", "manager"],
  },
];

export const ACCOUNT_NAV_ITEMS: NavMenuItem[] = [
  { href: "/login", label: "login", icon: User },
  { href: "/register", label: "register", icon: User },
];

export function getAdminNavItems(role: UserRole): NavMenuItem[] {
  return ADMIN_NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );
}

export function canShowAdminNav(role: UserRole): boolean {
  return role !== "customer";
}
