"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bus,
  Car,
  Globe,
  Home,
  Hotel,
  LayoutDashboard,
  Moon,
  Package,
  Plane,
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
  { href: "/", label: "home", icon: Home },
  { href: "/packages", label: "packages", icon: Package },
  { href: "/vehicles", label: "vehicles", icon: Car },
  { href: "/hotels", label: "hotels", icon: Hotel },
  { href: "/bus/search", label: "bus", icon: Bus },
  { href: "/flights", label: "flights", icon: Plane },
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

  const homeNavLinkClass = isHome
    ? "text-white/90 hover:bg-white/10 hover:text-white"
    : "hover:bg-accent hover:text-accent-foreground";

  const homeNavActiveClass = isHome
    ? "bg-white/15 font-semibold text-white"
    : "bg-primary/10 text-primary";

  const homeIconBtnClass = isHome
    ? "text-white hover:bg-white/15 hover:text-white"
    : undefined;

  const homeOutlineBtnClass = isHome
    ? "rounded-full border-white/40 bg-white/15 px-4 text-white shadow-sm backdrop-blur-md hover:bg-white/25 hover:text-white"
    : undefined;

  const homeGhostBtnClass = isHome
    ? "rounded-full text-white hover:bg-white/15 hover:text-white"
    : "rounded-full font-medium hover:bg-primary/5";

  return (
    <header
      className={cn(
        "z-50 w-full overflow-visible",
        isHome
          ? "absolute inset-x-0 top-0 border-0 bg-transparent"
          : "sticky top-0 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-background/95"
      )}
    >
      <div className="container mx-auto flex min-h-[5.5rem] items-center justify-between gap-2 px-3 py-1.5 sm:gap-3 sm:px-4 md:min-h-[6.25rem]">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <BrandLogo priority size="header" />
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                homeNavLinkClass,
                isNavActive(pathname, link.href) && homeNavActiveClass
              )}
            >
              {t(locale, "nav", link.label)}
            </Link>
          ))}
          {isStaff && (
            <Link
              href={adminHome}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                homeNavLinkClass,
                pathname.startsWith("/admin") &&
                  (isHome ? "bg-white/20 text-white" : "bg-primary text-primary-foreground")
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
                  className={cn("h-9 w-9", homeIconBtnClass)}
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
            className={cn("relative h-9 w-9", homeIconBtnClass)}
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
                <Button variant="ghost" size="sm" className={homeGhostBtnClass}>
                  {t(locale, "nav", "myBookings")}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className={cn("hidden sm:inline-flex", homeOutlineBtnClass)}
                onClick={() => logout()}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link href="/my-bookings" className="hidden sm:block">
                <Button variant="ghost" size="sm" className={homeGhostBtnClass}>
                  {t(locale, "nav", "myBookings")}
                </Button>
              </Link>
              <Link href="/login" className="hidden sm:block">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1.5 font-semibold",
                    isHome
                      ? homeOutlineBtnClass
                      : "rounded-full border-primary/30 px-4 shadow-sm hover:bg-primary/5"
                  )}
                >
                  <User className="h-4 w-4" />
                  {t(locale, "nav", "login")}
                </Button>
              </Link>
            </>
          )}

          <RoleNavigationDrawer
            triggerClassName="inline-flex md:hidden"
            transparentSurface={isHome}
          />

          <RoleNavigationDrawer
            showLabel
            triggerClassName={cn(
              "hidden md:inline-flex",
              "h-11 min-w-[5.5rem] gap-2 rounded-full px-4",
              isHome
                ? "border-white/40 bg-white/15 text-white shadow-md backdrop-blur-md hover:bg-white/25"
                : "border-primary/30 shadow-sm hover:bg-primary/5"
            )}
          />
        </div>
      </div>
    </header>
  );
}
