"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  Home,
  Loader2,
  Printer,
} from "lucide-react";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import {
  HotelCard,
  HotelPrimaryButton,
  HotelStatusBadge,
} from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { HotelGuestLoginDetailsCard } from "@/components/hotels-tripjack/hotel-guest-login-details-card";
import { useHotelBookingApi } from "@/hooks/use-hotel-booking";
import { customerApiFetch } from "@/lib/admin/api-client";
import { getHotelInvoiceDownloadUrl } from "@/lib/hotels/invoice-access";
import {
  getHotelReferenceLabel,
  resolveHotelBookingUiStatus,
} from "@/lib/hotels/booking-status-helpers";
import { resolveHotelLoginCredentials } from "@/lib/hotels/hotel-login-credentials";
import type { HotelBookingRecord } from "@/lib/hotels/types";
import { formatCurrency } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

function loadSessionBooking(): HotelBookingRecord | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("tripjack_hotel_confirmed_booking");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HotelBookingRecord;
  } catch {
    return null;
  }
}

function loadSessionLoginCredentials(): { loginEmail: string; loginPassword: string } | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("tripjack_hotel_login_credentials");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { loginEmail: string; loginPassword: string };
  } catch {
    return null;
  }
}

export function HotelBookingSuccessClient() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId") ?? "";
  const { locale } = useAppStore();
  const api = useHotelBookingApi();
  const [booking, setBooking] = useState<HotelBookingRecord | null>(null);
  const [loginCredentials, setLoginCredentials] = useState<{
    loginEmail: string;
    loginPassword: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const storedLogin = loadSessionLoginCredentials();
    if (storedLogin) {
      setLoginCredentials(storedLogin);
    }

    const applyBooking = (b: HotelBookingRecord) => {
      setBooking(b);
      sessionStorage.setItem("tripjack_hotel_confirmed_booking", JSON.stringify(b));
      if (!storedLogin && b.paymentStatus === "paid") {
        setLoginCredentials(resolveHotelLoginCredentials(b));
      }
      setLoading(false);
    };

    const startPolling = (b: HotelBookingRecord) => {
      const uiStatus = resolveHotelBookingUiStatus(b);
      if ((uiStatus === "pending" || uiStatus === "failed") && b.paymentStatus === "paid") {
        void api.pollBookingStatus(b.bookingId, applyBooking);
      }
    };

    if (!bookingId) {
      const sessionBooking = loadSessionBooking();
      if (sessionBooking) {
        applyBooking(sessionBooking);
        startPolling(sessionBooking);
      } else {
        setLoading(false);
      }
      return;
    }

    void api.fetchBooking(bookingId, { publicAccess: true }).then((serverBooking) => {
      if (serverBooking) {
        applyBooking(serverBooking);
        startPolling(serverBooking);
        return;
      }
      const sessionBooking = loadSessionBooking();
      if (sessionBooking?.bookingId === bookingId) {
        applyBooking(sessionBooking);
        startPolling(sessionBooking);
      } else {
        setLoading(false);
      }
    });
  }, [bookingId]);

  const downloadInvoice = async () => {
    if (!booking) return;
    setDownloading(true);
    try {
      const tokenUrl = getHotelInvoiceDownloadUrl(booking.bookingId, booking.customerEmail);
      let res = await fetch(tokenUrl, { credentials: "include" });

      if (!res.ok) {
        res = await customerApiFetch(`/api/hotels/bookings/${booking.bookingId}/invoice`);
      }

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(
          (json as { error?: string }).error ?? "Could not download invoice"
        );
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `SafarSathi-Hotel-Invoice-${booking.bookingId}.pdf`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      toast.success("Invoice downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invoice download failed");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: HOTEL_UI.bg }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: HOTEL_UI.action }} />
      </div>
    );
  }

  if (!booking) {
    return (
      <HotelBookingLayout title="Booking not found" maxWidth="md">
        <Link href="/hotels/search" style={{ color: HOTEL_UI.action }}>
          Search hotels
        </Link>
      </HotelBookingLayout>
    );
  }

  const uiStatus = resolveHotelBookingUiStatus(booking);
  const confirmed = uiStatus === "confirmed";
  const failed = uiStatus === "failed";
  const pending = uiStatus === "pending";
  const tripjackStatus = (booking.tripjackStatus ?? "").toUpperCase();
  const showHold =
    !failed &&
    !confirmed &&
    (tripjackStatus.includes("HOLD") || booking.status === "booking_pending");
  const showCancellationPending =
    booking.status === "cancellation_requested" ||
    (booking.cancellationStatus ?? "").toUpperCase() === "REQUESTED" ||
    tripjackStatus.includes("CANCELLATION_PENDING");
  const hotelReference = getHotelReferenceLabel(booking);
  const hasConfirmedSignals =
    booking.paymentStatus === "paid" &&
    Boolean(
      booking.confirmedEmailSentAt ||
        booking.emailSentAt ||
        booking.voucherUrl ||
        booking.confirmationNumber ||
        booking.supplierReference ||
        booking.hotelReference
    );
  const effectiveFailed = failed && !hasConfirmedSignals;
  const effectiveConfirmed = confirmed || hasConfirmedSignals;
  const guestCount = booking.rooms.reduce(
    (sum, r) => sum + (r.adults ?? 1) + (r.children ?? 0),
    0
  );

  return (
    <HotelBookingLayout maxWidth="md">
      <HotelCard padding="lg" className="text-center">
        {effectiveFailed ? (
          <AlertCircle className="mx-auto h-16 w-16 text-red-600" />
        ) : (
          <CheckCircle2
            className="mx-auto h-16 w-16"
            style={{
              color: effectiveConfirmed ? HOTEL_UI.success : pending ? HOTEL_UI.pending : HOTEL_UI.action,
            }}
          />
        )}
        <h1 className="mt-4 text-2xl font-bold" style={{ color: HOTEL_UI.primary }}>
          {effectiveFailed
            ? "Booking Unsuccessful"
            : showCancellationPending
              ? "Cancellation Pending"
              : effectiveConfirmed
                ? "Booking Confirmed"
                : showHold
                  ? "Booking On Hold"
                  : pending
                    ? "Booking Pending"
                    : "Booking Status"}
        </h1>
        <p className="mt-2 text-sm" style={{ color: HOTEL_UI.textMuted }}>
          {effectiveFailed
            ? "We could not confirm your hotel with the supplier. Our support team will assist with refund/help."
            : showCancellationPending
              ? "Your cancellation request has been submitted and is being processed by the supplier."
              : effectiveConfirmed
                ? booking.emailSentAt
                  ? "Your hotel reservation is confirmed. A confirmation email with invoice and login details has been sent."
                  : "Your hotel reservation is confirmed."
                : showHold
                  ? "Your booking is currently on hold. We are waiting for supplier confirmation."
                  : pending
                    ? "Payment received. Booking confirmation is in progress — we will email you once confirmed."
                    : booking.status.replace(/_/g, " ")}
        </p>

        <div className="mt-2 flex justify-center">
          <HotelStatusBadge
            status={effectiveFailed ? "failed" : effectiveConfirmed ? "confirmed" : pending ? "pending" : "default"}
          />
        </div>

        {pending && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm" style={{ color: HOTEL_UI.textMuted }}>
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking confirmation with supplier…
          </div>
        )}

        <div
          className="mt-8 space-y-3 border p-5 text-left text-sm"
          style={{ backgroundColor: "#FAFBFC", borderColor: HOTEL_UI.border, borderRadius: HOTEL_UI.cardRadius }}
        >
          <Row label="Hotel" value={booking.hotelName} />
          <Row label="Booking ID" value={booking.bookingId} mono />
          {hotelReference !== "—" && (
            <Row label="Hotel Reference" value={hotelReference} mono />
          )}
          {booking.confirmationNumber && booking.confirmationNumber !== hotelReference && (
            <Row label="Confirmation" value={booking.confirmationNumber} mono />
          )}
          <Row label="Check-in" value={booking.checkIn} />
          <Row label="Check-out" value={booking.checkOut} />
          <Row label="Guests" value={String(guestCount)} />
          <Row label="Room" value={booking.roomName} />
          <Row label="Amount paid" value={formatCurrency(booking.totalFare, locale)} highlight />
        </div>

        {!effectiveFailed && (
          <HotelGuestLoginDetailsCard booking={booking} loginCredentials={loginCredentials} />
        )}

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {booking.paymentStatus === "paid" && (
            <HotelPrimaryButton variant="outline" onClick={() => void downloadInvoice()} disabled={downloading}>
              <Download className="mr-2 inline h-4 w-4" />
              Download Invoice
            </HotelPrimaryButton>
          )}
          <Link href={`/hotels/booking/${booking.bookingId}`}>
            <HotelPrimaryButton>View Booking Details</HotelPrimaryButton>
          </Link>
          {booking.voucherUrl && (
            <a href={booking.voucherUrl} target="_blank" rel="noopener noreferrer" className="sm:col-span-2">
              <HotelPrimaryButton variant="outline">
                <ExternalLink className="mr-2 inline h-4 w-4" />
                Download Voucher
              </HotelPrimaryButton>
            </a>
          )}
          <Link href={`/hotels/voucher/${booking.bookingId}`} className="sm:col-span-2">
            <HotelPrimaryButton variant="outline">
              <Printer className="mr-2 inline h-4 w-4" />
              View Voucher / Ticket
            </HotelPrimaryButton>
          </Link>
          <Link href="/my-bookings" className="sm:col-span-2">
            <HotelPrimaryButton variant="outline">Go to My Bookings</HotelPrimaryButton>
          </Link>
          <Link href="/" className="sm:col-span-2">
            <HotelPrimaryButton variant="outline">
              <Home className="mr-2 inline h-4 w-4" />
              Back to Home
            </HotelPrimaryButton>
          </Link>
        </div>
      </HotelCard>
    </HotelBookingLayout>
  );
}

function Row({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span style={{ color: HOTEL_UI.textMuted }}>{label}</span>
      <span
        className={`text-right ${mono ? "font-mono text-xs" : ""} ${highlight ? "font-bold" : "font-medium"}`}
        style={{ color: highlight ? HOTEL_UI.primary : HOTEL_UI.text }}
      >
        {value}
      </span>
    </div>
  );
}
