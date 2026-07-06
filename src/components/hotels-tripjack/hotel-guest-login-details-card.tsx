"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { HotelCard } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { resolveHotelLoginCredentials } from "@/lib/hotels/hotel-login-credentials";
import type { HotelBookingRecord } from "@/lib/hotels/types";

const STORAGE_PREFIX = "safarsathi-hotel-login-dismissed:";

export function HotelGuestLoginDetailsCard({
  booking,
  loginCredentials,
}: {
  booking: HotelBookingRecord;
  loginCredentials?: { loginEmail: string; loginPassword: string } | null;
}) {
  const [hidePassword, setHidePassword] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHidePassword(window.sessionStorage.getItem(`${STORAGE_PREFIX}${booking.bookingId}`) === "1");
  }, [booking.bookingId]);

  const credentials =
    loginCredentials ??
    (booking.guestAccountProvisioned ? resolveHotelLoginCredentials(booking) : null);

  if (!credentials) return null;

  const dismissPassword = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`${STORAGE_PREFIX}${booking.bookingId}`, "1");
    }
    setHidePassword(true);
  };

  return (
    <HotelCard className="border-blue-200 bg-gradient-to-br from-blue-50/90 to-white">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5" style={{ color: HOTEL_UI.action }} />
        <p className="font-semibold" style={{ color: HOTEL_UI.primary }}>
          Your login details
        </p>
      </div>
      <p className="mt-2 text-sm" style={{ color: HOTEL_UI.textMuted }}>
        We created a Safar Sathi account for you. Sign in to view hotel bookings, download
        invoices, and manage cancellations.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded border bg-white px-4 py-3" style={{ borderColor: HOTEL_UI.border }}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Email</p>
          <p className="mt-1 break-all font-mono text-sm font-semibold">{credentials.loginEmail}</p>
        </div>
        <div className="rounded border bg-white px-4 py-3" style={{ borderColor: HOTEL_UI.border }}>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Password (Booking ID)
          </p>
          {hidePassword ? (
            <p className="mt-1 text-sm text-slate-600">
              Sent to your email. Use your Booking ID to sign in again.
            </p>
          ) : (
            <p className="mt-1 break-all font-mono text-sm font-semibold" style={{ color: HOTEL_UI.action }}>
              {credentials.loginPassword}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/login?redirect=/account/hotel-bookings"
          className="inline-flex h-9 items-center rounded px-4 text-sm font-medium text-white"
          style={{ backgroundColor: HOTEL_UI.action }}
        >
          Sign in to My Bookings
        </Link>
        {!hidePassword && (
          <button
            type="button"
            className="inline-flex h-9 items-center rounded border px-4 text-sm"
            style={{ borderColor: HOTEL_UI.border }}
            onClick={dismissPassword}
          >
            Hide password
          </button>
        )}
      </div>
    </HotelCard>
  );
}
