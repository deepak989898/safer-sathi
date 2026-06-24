"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bus,
  Car,
  Globe,
  Hotel,
  LayoutDashboard,
  Moon,
  Package,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { BrandLogo } from "@/components/layout/brand-logo";
import { RoleNavigationDrawer } from "@/components/layout/role-navigation-drawer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/store/app-store";
import { useAuth } from "@/contexts/auth-context";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { getLoginRedirect } from "@/lib/auth/constants";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";

const navLinks = [
  { href: "/packages", label: "packages", icon: Package },
  { href: "/vehicles", label: "vehicles", icon: Car },
  { href: "/hotels", label: "hotels", icon: Hotel },
  { href: "/bus-booking", label: "bus", icon: Bus },
];

function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const { locale, setLocale } = useAppStore();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const isStaff = user ? canShowAdminNav(user.role) : false;
  const adminHome = user ? getLoginRedirect(user.role) : "/admin";
  const isHome = pathname === "/";

  return (
    <header
      className={cn(
        "z-50 w-full overflow-visible",
        isHome
          ? "absolute inset-x-0 top-0 border-0 bg-transparent md:sticky md:border-b md:bg-white/95 md:backdrop-blur md:supports-[backdrop-filter]:md:bg-white/80 dark:md:bg-background/95"
          : "sticky top-0 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-background/95"
      )}
    >
      <div className="container mx-auto flex min-h-[5.5rem] items-center justify-between gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 md:min-h-[6.25rem]">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <RoleNavigationDrawer showLabel triggerClassName="hidden md:inline-flex" />
          <BrandLogo priority size="header" />
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isNavActive(pathname, link.href) && "bg-primary/10 text-primary"
              )}
            >
              {t(locale, "nav", link.label)}
            </Link>
          ))}
          {isStaff && (
            <Link
              href={adminHome}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname.startsWith("/admin") && "bg-primary text-primary-foreground"
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <LayoutDashboard className="h-4 w-4" />
                Admin Panel
              </span>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9",
                    isHome && "text-white md:text-inherit"
                  )}
                />
              }
            >
              <Globe className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocale("en")}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocale("hi")}>
                हिंदी
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative h-9 w-9",
              isHome && "text-white md:text-inherit"
            )}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {mounted ? (
              <>
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </>
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {user ? (
            <>
              {isStaff && (
                <Link href={adminHome} className="hidden md:block lg:hidden">
                  <Button size="sm">
                    <LayoutDashboard className="mr-1 h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}
              <Link href="/my-bookings" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  {t(locale, "nav", "myBookings")}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={() => logout()}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/my-bookings" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  {t(locale, "nav", "myBookings")}
                </Button>
              </Link>
              <Link href="/login" className="hidden sm:block">
                <Button variant="outline" size="sm">
                  <User className="mr-1 h-4 w-4" />
                  {t(locale, "nav", "login")}
                </Button>
              </Link>
            </>
          )}

          <RoleNavigationDrawer
            triggerClassName="inline-flex md:hidden"
            transparentSurface={isHome}
          />
        </div>
      </div>
    </header>
  );
}
