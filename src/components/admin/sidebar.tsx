"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Menu } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { RoleNavigationDrawer } from "@/components/layout/role-navigation-drawer";
import { useAuth } from "@/contexts/auth-context";
import type { User } from "@/types";
import { ROLE_LABELS } from "@/lib/auth/constants";
import { getAdminNavItems } from "@/lib/navigation/role-menus";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const navItems = user ? getAdminNavItems(user.role) : [];

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <SidebarContent
          pathname={pathname}
          navItems={navItems}
          user={user}
          onLogout={() => logout()}
        />
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <Menu className="h-4 w-4" />
                </Button>
              }
            />
            <SheetContent side="left" className="flex w-80 flex-col p-0">
              <SheetHeader className="border-b px-6 py-5 text-left">
                <SheetTitle className="text-base">Admin Panel</SheetTitle>
                {user && (
                  <p className="text-sm text-muted-foreground">
                    {user.name} · {ROLE_LABELS[user.role]}
                  </p>
                )}
              </SheetHeader>
        <div className="flex flex-1 flex-col overflow-hidden">
              <SidebarContent
                pathname={pathname}
                navItems={navItems}
                user={user}
                onLogout={() => logout()}
                compact
              />
            </div>
            </SheetContent>
          </Sheet>
          <div>
            <p className="text-sm font-semibold">Safar Sathi</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
        <RoleNavigationDrawer />
      </header>
    </>
  );
}

function SidebarContent({
  pathname,
  navItems,
  user,
  onLogout,
  compact = false,
}: {
  pathname: string;
  navItems: ReturnType<typeof getAdminNavItems>;
  user: User | null;
  onLogout: () => void;
  compact?: boolean;
}) {
  return (
    <>
      {!compact && (
        <div className="border-b border-sidebar-border px-6 py-4">
          <BrandLogo href="/" imageClassName="h-10" />
          <p className="mt-1 text-xs text-sidebar-foreground/60">Admin Panel</p>
        </div>
      )}

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

        <Link
          href="/"
          className="mt-4 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LayoutDashboard className="size-4 shrink-0" />
          Customer Website
        </Link>
      </nav>

      <div className="space-y-3 border-t border-sidebar-border p-4">
        {user && (
          <div className="rounded-lg bg-sidebar-accent px-3 py-2.5">
            <p className="text-sm font-medium text-sidebar-accent-foreground">
              {user.name}
            </p>
            <p className="text-xs text-sidebar-foreground/60">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/80"
          onClick={onLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );
}
