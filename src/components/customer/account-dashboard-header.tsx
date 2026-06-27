"use client";

import { CalendarCheck, Gift, Luggage } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountDashboardHeaderProps {
  name: string;
  email: string;
  bookingCount: number;
  upcomingCount: number;
  rewardPoints: number;
  loading?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function AccountDashboardHeader({
  name,
  email,
  bookingCount,
  upcomingCount,
  rewardPoints,
  loading,
}: AccountDashboardHeaderProps) {
  const firstName = name.trim().split(/\s+/)[0] || "Traveler";

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-5 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-sky-600 text-sm font-bold text-primary-foreground shadow-sm sm:h-14 sm:w-14 sm:text-base"
              aria-hidden
            >
              {getInitials(name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                My account
              </p>
              <h1 className="truncate text-xl font-bold text-[#0c2444] dark:text-foreground sm:text-2xl">
                Welcome back, {firstName}
              </h1>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <StatChip
              icon={Luggage}
              label="Bookings"
              value={loading ? "—" : String(bookingCount)}
            />
            <StatChip
              icon={CalendarCheck}
              label="Upcoming"
              value={loading ? "—" : String(upcomingCount)}
            />
            <StatChip
              icon={Gift}
              label="Points"
              value={loading ? "—" : String(rewardPoints)}
              highlight
            />
          </div>
        </div>
      </div>
    </header>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Luggage;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-2.5 py-2 text-center sm:px-4 sm:py-2.5",
        highlight
          ? "border-amber-200/80 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30"
          : "bg-muted/40"
      )}
    >
      <Icon
        className={cn(
          "mx-auto mb-1 h-3.5 w-3.5 sm:h-4 sm:w-4",
          highlight ? "text-amber-600" : "text-primary"
        )}
      />
      <p className="text-base font-bold leading-none text-[#0c2444] dark:text-foreground sm:text-lg">
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-xs">{label}</p>
    </div>
  );
}
