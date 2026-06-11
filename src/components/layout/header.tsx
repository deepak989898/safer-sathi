"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bus,
  Car,
  Globe,
  Hotel,
  Menu,
  Moon,
  Package,
  Plane,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAppStore } from "@/store/app-store";
import { useAuth } from "@/contexts/auth-context";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useMounted } from "@/hooks/use-mounted";

const navLinks = [
  { href: "/packages", label: "packages", icon: Package },
  { href: "/vehicles", label: "vehicles", icon: Car },
  { href: "/hotels", label: "hotels", icon: Hotel },
  { href: "/bus-booking", label: "bus", icon: Bus },
  { href: "/ai-assistant", label: "aiAssistant", icon: Sparkles },
];

export function Header() {
  const pathname = usePathname();
  const { locale, setLocale } = useAppStore();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:bg-background/95">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold text-primary">Safar Sathi</span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              AI Travel Platform
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === link.href && "bg-primary/10 text-primary"
              )}
            >
              {t(locale, "nav", link.label)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon" className="h-9 w-9" />}
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
            className="relative h-9 w-9"
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

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="mt-8 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    <link.icon className="h-4 w-4" />
                    {t(locale, "nav", link.label)}
                  </Link>
                ))}
                <Link href="/my-bookings" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                  {t(locale, "nav", "myBookings")}
                </Link>
                {user ? (
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="rounded-md px-3 py-2 text-left text-sm font-medium hover:bg-accent"
                  >
                    Sign Out
                  </button>
                ) : (
                  <Link href="/login" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                    {t(locale, "nav", "login")}
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
