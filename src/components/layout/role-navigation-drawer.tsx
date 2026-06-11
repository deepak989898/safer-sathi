"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  UserPlus,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/auth-context";
import { ROLE_LABELS } from "@/lib/auth/constants";
import { t } from "@/lib/i18n";
import {
  canShowAdminNav,
  CUSTOMER_NAV_ITEMS,
  getAdminNavItems,
} from "@/lib/navigation/role-menus";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

interface RoleNavigationDrawerProps {
  triggerClassName?: string;
  showLabel?: boolean;
}

export function RoleNavigationDrawer({
  triggerClassName,
  showLabel = false,
}: RoleNavigationDrawerProps) {
  const pathname = usePathname();
  const { locale } = useAppStore();
  const { user, logout } = useAuth();
  const adminItems = user ? getAdminNavItems(user.role) : [];
  const isStaff = user ? canShowAdminNav(user.role) : false;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size={showLabel ? "sm" : "icon"}
            className={cn(
              showLabel ? "gap-2" : "h-9 w-9",
              triggerClassName
            )}
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
            {showLabel ? "Menu" : null}
          </Button>
        }
      />
      <SheetContent side="left" className="flex w-80 flex-col p-0 sm:w-96">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="sr-only">Safar Sathi Navigation</SheetTitle>
          <BrandLogo href="/" size="drawer" centered priority />
          <Separator className="my-2" />
          {user ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <Badge variant="secondary" className="gap-1">
                <Shield className="h-3 w-3" />
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
          ) : (
            <p className="text-center text-xs leading-snug text-muted-foreground">
              Sign in to access bookings and admin tools
            </p>
          )}
        </SheetHeader>

        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {isStaff && (
            <section className="space-y-2">
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Admin Panel
              </p>
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </section>
          )}

          <section className="space-y-2">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isStaff ? "Browse Website" : "Navigation"}
            </p>
            {CUSTOMER_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(locale, "nav", item.label)}
                </Link>
              );
            })}
          </section>

          {!user && (
            <section className="space-y-2">
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Account
              </p>
              <Link
                href="/login"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
              >
                <LayoutDashboard className="h-4 w-4" />
                {t(locale, "nav", "login")}
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
              >
                <UserPlus className="h-4 w-4" />
                {t(locale, "nav", "register")}
              </Link>
              <Link
                href="/register/staff"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent"
              >
                <Shield className="h-4 w-4" />
                Staff Registration
              </Link>
            </section>
          )}
        </nav>

        <div className="border-t p-4">
          {user ? (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => logout()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Link href="/login" className="block">
              <Button className="w-full">{t(locale, "nav", "login")}</Button>
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
