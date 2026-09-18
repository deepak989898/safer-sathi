"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Shield,
  Sun,
  UserPlus,
} from "lucide-react";
import { useTheme } from "next-themes";
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
import { useMounted } from "@/hooks/use-mounted";

interface RoleNavigationDrawerProps {
  triggerClassName?: string;
  showLabel?: boolean;
  /** White circular trigger for transparent hero header */
  transparentSurface?: boolean;
}

export function RoleNavigationDrawer({
  triggerClassName,
  showLabel = false,
  transparentSurface = false,
}: RoleNavigationDrawerProps) {
  const pathname = usePathname();
  const { locale, setLocale } = useAppStore();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const adminItems = user ? getAdminNavItems(user.role) : [];
  const isStaff = user ? canShowAdminNav(user.role) : false;
  const isDark = mounted && theme === "dark";

  const closeMenu = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="outline"
            size={showLabel ? "default" : "icon"}
            className={cn(
              showLabel
                ? "h-11 min-w-[5.5rem] gap-2.5 rounded-xl border-2 px-3.5 text-sm font-semibold shadow-sm"
                : transparentSurface
                  ? "h-10 w-10 rounded-full border-0 bg-white text-slate-900 shadow-md hover:bg-white/95"
                  : "h-11 w-11 rounded-xl border-2 border-border bg-background text-foreground shadow-sm",
              triggerClassName
            )}
            aria-label="Open navigation menu"
          >
            <Menu className="h-6 w-6 shrink-0" strokeWidth={2.5} />
            {showLabel ? "Menu" : null}
          </Button>
        }
      />
      <SheetContent side="right" className="flex w-80 flex-col p-0 sm:w-96">
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="sr-only">Safar Sathi Navigation</SheetTitle>
          <BrandLogo href="/" size="drawer" centered priority />
          <Separator className="my-2" />
          {user ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
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
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent"
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
                  onClick={closeMenu}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(locale, "nav", item.label)}
                </Link>
              );
            })}
          </section>

          {/* Language + theme stacked vertically to free header space */}
          <section className="space-y-3">
            <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Preferences
            </p>

            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                Language
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant={locale === "en" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setLocale("en")}
                >
                  English
                </Button>
                <Button
                  type="button"
                  variant={locale === "hi" ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setLocale("hi")}
                >
                  हिंदी
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                {isDark ? (
                  <Moon className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Sun className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                Theme
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant={!isDark ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setTheme("light")}
                >
                  <Sun className="mr-2 h-4 w-4" />
                  Light
                </Button>
                <Button
                  type="button"
                  variant={isDark ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="mr-2 h-4 w-4" />
                  Dark
                </Button>
              </div>
            </div>
          </section>

          {!user && (
            <section className="space-y-2">
              <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Account
              </p>
              <Link
                href="/login"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                <LayoutDashboard className="h-4 w-4" />
                {t(locale, "nav", "login")}
              </Link>
              <Link
                href="/register"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                <UserPlus className="h-4 w-4" />
                {t(locale, "nav", "register")}
              </Link>
              <Link
                href="/register/staff"
                onClick={closeMenu}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
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
              className="w-full justify-start border-border text-foreground"
              onClick={() => {
                closeMenu();
                logout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          ) : (
            <Link href="/login" className="block" onClick={closeMenu}>
              <Button className="w-full">{t(locale, "nav", "login")}</Button>
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
