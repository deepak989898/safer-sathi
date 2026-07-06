"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { FlightSoftCard } from "@/components/flights/flight-ui";
import { Button } from "@/components/ui/button";
import { resolveFlightLoginCredentials } from "@/lib/flights/flight-login-credentials";
import type { FlightBookingRecord } from "@/lib/flights/types";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "safarsathi-flight-login-dismissed:";

interface GuestLoginDetailsCardProps {
  booking: FlightBookingRecord;
  className?: string;
}

export function GuestLoginDetailsCard({ booking, className }: GuestLoginDetailsCardProps) {
  const [hidePassword, setHidePassword] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHidePassword(window.sessionStorage.getItem(`${STORAGE_PREFIX}${booking.bookingId}`) === "1");
  }, [booking.bookingId]);

  if (!booking.guestAccountProvisioned) return null;

  const { loginEmail, loginPassword } = resolveFlightLoginCredentials(booking);

  const dismissPassword = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(`${STORAGE_PREFIX}${booking.bookingId}`, "1");
    }
    setHidePassword(true);
  };

  return (
    <FlightSoftCard className={cn("border-blue-200 bg-gradient-to-br from-blue-50/90 to-white", className)}>
      <div className="p-4 md:p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[#1a4fa3]" />
          <p className="font-semibold text-slate-900">Your login details</p>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          We created a Safar Sathi account for you. Sign in anytime to view flight bookings,
          download tickets, and manage cancellations.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Email</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-900">{loginEmail}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Password (Booking ID)
            </p>
            {hidePassword ? (
              <p className="mt-1 text-sm text-slate-600">
                Sent to your email. Use your Booking ID if you need to sign in again.
              </p>
            ) : (
              <p className="mt-1 break-all font-mono text-sm font-semibold text-[#1a4fa3]">
                {loginPassword}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/login?redirect=/account/flight-bookings"
            className="inline-flex h-8 items-center rounded-lg bg-[#1a4fa3] px-3 text-sm font-medium text-white hover:bg-[#16408a]"
          >
            Sign in to My Bookings
          </Link>
          {!hidePassword && (
            <Button size="sm" variant="outline" className="rounded-lg" onClick={dismissPassword}>
              Hide password
            </Button>
          )}
        </div>
      </div>
    </FlightSoftCard>
  );
}
