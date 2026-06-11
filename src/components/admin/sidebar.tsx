"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  Building2,
  CalendarCheck,
  Car,
  Cog,
  GitBranch,
  Headphones,
  LayoutDashboard,
  Map,
  Megaphone,
  Package,
  Shield,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/packages", label: "Packages", icon: Package },
  { href: "/admin/hotels", label: "Hotels", icon: Building2 },
  { href: "/admin/ai-agents", label: "AI Agents", icon: Bot },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/support", label: "Support", icon: Headphones },
  { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
  { href: "/admin/workflows", label: "Workflows", icon: GitBranch },
  { href: "/admin/roles", label: "Roles", icon: Shield },
  { href: "/admin/settings", label: "Settings", icon: Cog },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Map className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Safar Sathi</p>
          <p className="text-xs text-sidebar-foreground/60">Admin Panel</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-sidebar-accent px-3 py-2.5">
          <p className="text-xs font-medium text-sidebar-accent-foreground">AI-Powered Platform</p>
          <p className="mt-0.5 text-xs text-sidebar-foreground/50">6 agents active</p>
        </div>
      </div>
    </aside>
  );
}
