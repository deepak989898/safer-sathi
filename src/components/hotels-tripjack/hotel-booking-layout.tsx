"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { HotelSessionCountdown } from "@/components/hotels-tripjack/hotel-session-countdown";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { cn } from "@/lib/utils";

interface HotelBookingLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  showCountdown?: boolean;
  onSessionExpired?: () => void;
  hero?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const maxW = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-6xl",
  full: "max-w-7xl",
};

export function HotelBookingLayout({
  children,
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  showCountdown,
  onSessionExpired,
  hero = false,
  maxWidth = "lg",
  className,
}: HotelBookingLayoutProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: HOTEL_UI.bg }}>
      {hero ? (
        <header style={{ backgroundColor: HOTEL_UI.primary }} className="text-white">
          <div className="container mx-auto px-4 py-8 md:py-10">
            {backHref && (
              <Link
                href={backHref}
                className="mb-4 inline-flex items-center text-sm text-white/90 hover:text-white"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {backLabel}
              </Link>
            )}
            {title && (
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            )}
            {subtitle && <p className="mt-2 max-w-2xl text-sm text-white/85">{subtitle}</p>}
          </div>
        </header>
      ) : (
        <header className="border-b bg-white shadow-sm">
          <div className="container mx-auto flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {backHref && (
                <Link
                  href={backHref}
                  className="mb-1 inline-flex items-center text-sm font-medium hover:underline"
                  style={{ color: HOTEL_UI.action }}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  {backLabel}
                </Link>
              )}
              {title && (
                <h1 className="text-xl font-bold md:text-2xl" style={{ color: HOTEL_UI.primary }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm" style={{ color: HOTEL_UI.textMuted }}>
                  {subtitle}
                </p>
              )}
            </div>
            {showCountdown && <HotelSessionCountdown onExpired={onSessionExpired} />}
          </div>
        </header>
      )}

      <main className={cn("container mx-auto px-4 py-6 md:py-8", maxW[maxWidth], className)}>
        {children}
      </main>
    </div>
  );
}
