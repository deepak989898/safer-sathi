"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { AdminNotificationsBell } from "@/components/admin/admin-notifications-bell";
import { BrandLogo } from "@/components/layout/brand-logo";
import { useAuth } from "@/contexts/auth-context";
import { ROLE_LABELS } from "@/lib/auth/constants";
import { getAdminNavGroups } from "@/lib/navigation/role-menus";
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
  const navGroups = user ? getAdminNavGroups(user.role) : [];
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = () => setMobileOpen(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <SidebarContent
          pathname={pathname}
          navGroups={navGroups}
          onLogout={() => logout()}
        />
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-3 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" aria-label="Open admin menu">
                  <Menu className="h-4 w-4" />
                </Button>
              }
            />
            <SheetContent
              side="left"
              className="flex w-[min(100vw-2rem,20rem)] flex-col border-sidebar-border bg-sidebar p-0 text-sidebar-foreground [&_[data-slot=sheet-close]]:text-sidebar-foreground [&_[data-slot=sheet-close]:hover]:bg-sidebar-accent"
            >
              <SheetHeader className="border-b border-sidebar-border px-4 py-4 text-left">
                <SheetTitle className="text-base text-sidebar-foreground">Admin Panel</SheetTitle>
                {user && (
                  <p className="text-sm text-sidebar-foreground/60">
                    {user.name} · {ROLE_LABELS[user.role]}
                  </p>
                )}
              </SheetHeader>
              <div className="flex flex-1 flex-col overflow-hidden">
                <SidebarContent
                  pathname={pathname}
                  navGroups={navGroups}
                  onLogout={() => {
                    handleNavigate();
                    void logout();
                  }}
                  onNavigate={handleNavigate}
                  compact
                />
              </div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Safar Sathi</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
        <AdminNotificationsBell />
      </header>
    </>
  );
}

function SidebarContent({
  pathname,
  navGroups,
  onLogout,
  onNavigate,
  compact = false,
}: {
  pathname: string;
  navGroups: ReturnType<typeof getAdminNavGroups>;
  onLogout: () => void;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <>
      {!compact && (
        <div className="border-b border-sidebar-border px-6 py-4">
          <BrandLogo href="/" size="admin" onDarkSurface />
          <p className="mt-1 text-xs text-sidebar-foreground/60">Admin Panel</p>
        </div>
      )}

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
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
          </div>
        ))}

        <div className="space-y-1 border-t border-sidebar-border pt-4">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </nav>
    </>
  );
}
