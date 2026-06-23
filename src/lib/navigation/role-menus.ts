import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bot,
  Building2,
  Bus,
  CalendarCheck,
  Car,
  Home,
  LayoutDashboard,
  MessageSquare,
  Mic,
  Package,
  Sparkles,
  Search,
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

export interface NavMenuGroup {
  id: string;
  label: string;
  items: NavMenuItem[];
}

export const CUSTOMER_NAV_ITEMS: NavMenuItem[] = [
  { href: "/", label: "home", icon: Home },
  { href: "/packages", label: "packages", icon: Package },
  { href: "/vehicles", label: "vehicles", icon: Car },
  { href: "/hotels", label: "hotels", icon: Building2 },
  { href: "/bus-booking", label: "bus", icon: Bus },
  { href: "/ai-voice", label: "aiVoice", icon: Mic },
  { href: "/my-bookings", label: "myBookings", icon: CalendarCheck },
];

export const ADMIN_NAV_GROUPS: NavMenuGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboard,
        roles: ["super_admin", "manager", "sales_agent", "support_agent", "driver"],
      },
      {
        href: "/admin/analytics",
        label: "Analytics",
        icon: BarChart3,
        roles: ["super_admin", "manager"],
      },
    ],
  },
  {
    id: "operations",
    label: "Bookings & Customers",
    items: [
      {
        href: "/admin/bookings",
        label: "Bookings",
        icon: CalendarCheck,
        roles: ["super_admin", "manager", "sales_agent", "support_agent", "driver"],
      },
      {
        href: "/admin/customers",
        label: "Customers",
        icon: Users,
        roles: ["super_admin", "manager", "sales_agent"],
      },
    ],
  },
  {
    id: "catalog",
    label: "Catalog",
    items: [
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
        href: "/admin/vehicles",
        label: "Vehicles",
        icon: Car,
        roles: ["super_admin", "manager"],
      },
    ],
  },
  {
    id: "ai",
    label: "AI Assistant",
    items: [
      {
        href: "/admin/ai-center",
        label: "AI Center",
        icon: Sparkles,
        roles: ["super_admin"],
      },
      {
        href: "/admin/ai-enquiries",
        label: "AI Enquiries",
        icon: MessageSquare,
        roles: ["super_admin", "manager", "sales_agent", "support_agent"],
      },
      {
        href: "/admin/ai-agents",
        label: "AI Agents",
        icon: Bot,
        roles: ["super_admin", "manager"],
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & SEO",
    items: [
      {
        href: "/admin/seo-center",
        label: "SEO Center",
        icon: Search,
        roles: ["super_admin", "manager"],
      },
    ],
  },
];

/** Flat list kept for backward compatibility */
export const ADMIN_NAV_ITEMS: NavMenuItem[] = ADMIN_NAV_GROUPS.flatMap(
  (group) => group.items
);

export const ACCOUNT_NAV_ITEMS: NavMenuItem[] = [
  { href: "/login", label: "login", icon: User },
  { href: "/register", label: "register", icon: User },
];

function filterNavItemsByRole(items: NavMenuItem[], role: UserRole): NavMenuItem[] {
  return items.filter((item) => !item.roles || item.roles.includes(role));
}

export function getAdminNavItems(role: UserRole): NavMenuItem[] {
  return filterNavItemsByRole(ADMIN_NAV_ITEMS, role);
}

export function getAdminNavGroups(role: UserRole): NavMenuGroup[] {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: filterNavItemsByRole(group.items, role),
  })).filter((group) => group.items.length > 0);
}

export function canShowAdminNav(role: UserRole): boolean {
  return role !== "customer";
}
