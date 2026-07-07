"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useFlightBookingApi } from "@/hooks/use-flight-booking";
import { FlightBookingTimeline } from "@/components/flights/flight-booking-timeline";
import { FlightCancelDialog } from "@/components/flights/flight-cancel-dialog";
import { FlightTicketView } from "@/components/flights/flight-ticket-view";
import { HideSiteFooter } from "@/components/layout/hide-site-footer";
import { Button } from "@/components/ui/button";
import { canCancelBooking, canReleasePnr } from "@/lib/flights/booking-guards";
import {
  isTicketPageProcessingStatus,
  TICKET_PAGE_POLL_INTERVAL_MS,
  TICKET_PAGE_POLL_MAX_MS,
} from "@/lib/flights/booking-status-display";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import type { FlightBookingRecord } from "@/lib/flights/types";
import type { NormalizedCancellationCharges } from "@/lib/tripjack/types";
import { useAppStore } from "@/store/app-store";

export default function FlightTicketPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { locale } = useAppStore();
  const { user } = useAuth();
  const api = useFlightBookingApi();
  const isStaff = user ? canShowAdminNav(user.role) : false;

  const [booking, setBooking] = useState<FlightBookingRecord | null>(null);
  const [bookingId, setBookingId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [charges, setCharges] = useState<NormalizedCancellationCharges | null>(null);
  const [loadingCharges, setLoadingCharges] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const applyBooking = useCallback((next: FlightBookingRecord) => {
    setBooking(next);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!bookingId) return;
    setRefreshing(true);
    const shouldPollAmendment =
      booking?.status === "cancellation_requested" ||
      booking?.status === "refund_processing" ||
      (booking?.amendmentId &&
        booking?.pollStatus !== "SUCCESS" &&
        booking?.pollStatus !== "FAILED" &&
        booking?.pollStatus !== "CANCELLED");
    const refreshed = shouldPollAmendment
      ? await api.pollAmendment(bookingId)
      : await api.refreshBookingDetail(bookingId);
    if (refreshed) {
      applyBooking(refreshed);
      setLoadError(null);
    }
    setRefreshing(false);
  }, [api, bookingId, booking, applyBooking]);

  useEffect(() => {
    void params.then(async ({ bookingId: id }) => {
      setBookingId(id);
      setRefreshing(true);
      const refreshed = await api.refreshBookingDetail(id);
      if (refreshed) {
        applyBooking(refreshed);
        setLoadError(null);
      } else {
        const fallback = await api.fetchBooking(id);
        if (fallback) {
          applyBooking(fallback);
          setLoadError(null);
        } else {
          setLoadError("Booking not found or ticket is not available yet.");
        }
      }
      setRefreshing(false);
    });
  }, [params]);

  // Poll booking details while ticket is being issued (up to ~3 minutes).
  useEffect(() => {
    if (!booking) return;
    if (!isTicketPageProcessingStatus(booking)) return;

    const started = Date.now();
    const timer = window.setInterval(() => {
      if (Date.now() - started > TICKET_PAGE_POLL_MAX_MS) {
        window.clearInterval(timer);
        return;
      }
      void api.refreshBookingDetail(booking.bookingId).then((b) => {
        if (b) applyBooking(b);
      });
    }, TICKET_PAGE_POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [
    booking?.bookingId,
    booking?.status,
    booking?.passengerTicketStatus,
    booking?.pipelineStatus,
    api,
    applyBooking,
  ]);

  // Poll amendment every 20s while cancellation is in progress.
  useEffect(() => {
    if (!booking?.amendmentId) return;
    if (booking.pollStatus === "SUCCESS" || booking.pollStatus === "FAILED" || booking.pollStatus === "CANCELLED") {
      return;
    }
    if (booking.status !== "cancellation_requested" && booking.pollStatus !== "polling") {
      return;
    }

    const timer = window.setInterval(() => {
      void (async () => {
        const updated = await api.pollAmendment(booking.bookingId);
        if (updated) applyBooking(updated);
      })();
    }, 20_000);

    return () => window.clearInterval(timer);
  }, [booking?.amendmentId, booking?.pollStatus, booking?.status, booking?.bookingId]);

  const openCancel = async () => {
    if (!booking) return;
    setCancelOpen(true);
    setCancelError(null);
    setCharges(null);
    setLoadingCharges(true);
    const result = await api.fetchCancellationCharges(booking.bookingId);
    setLoadingCharges(false);
    if (!result) {
      setCancelError(api.error ?? "Failed to load cancellation charges");
      return;
    }
    setCharges(result.charges);
    applyBooking(result.booking);
  };

  const confirmCancel = async () => {
    if (!booking) return;
    setConfirmingCancel(true);
    const updated = await api.confirmCancellation(booking.bookingId);
    setConfirmingCancel(false);
    if (!updated) {
      setCancelError(api.error ?? "Failed to submit cancellation");
      toast.error(api.error ?? "Cancellation failed — booking not marked cancelled");
      return;
    }
    applyBooking(updated);
    setCancelOpen(false);
    toast.success(updated.status === "cancelled" ? "Booking cancelled" : "Cancellation requested");
  };

  const handleReleasePnr = async () => {
    if (!booking) return;
    const ok = window.confirm("Release PNR for this hold booking? This cannot be undone.");
    if (!ok) return;
    const updated = await api.releasePnr(booking.bookingId);
    if (updated) {
      applyBooking(updated);
      toast.success("PNR released");
    } else {
      toast.error(api.error ?? "Failed to release PNR");
    }
  };

  const handleAdmin = async (
    action: "retry_poll" | "retry_booking_detail" | "retry_release_pnr" | "retry_book"
  ) => {
    if (!booking) return;
    const updated = await api.adminRetry(booking.bookingId, action);
    if (updated) {
      applyBooking(updated);
      toast.success("Admin action completed");
      if (isStaff) {
        console.log("[flight-admin]", action, updated);
      }
    } else {
      toast.error(api.error ?? "Admin action failed");
    }
  };

  if (loadError && !booking) {
    return (
      <div className="min-h-screen bg-[#f4f7fb]">
        <HideSiteFooter />
        <section className="container mx-auto max-w-lg px-4 py-16 text-center">
          <p className="font-semibold text-slate-900">Unable to load ticket</p>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Link href="/flights" className="mt-6 inline-block text-sm text-[#1a4fa3] hover:underline">
            Back to flights
          </Link>
        </section>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#f4f7fb]">
        <HideSiteFooter />
        <section className="container mx-auto px-4 py-16 text-center text-muted-foreground">
          Loading ticket…
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb] flight-ticket-page">
      <HideSiteFooter />
      <section className="container mx-auto max-w-3xl space-y-4 px-4 py-8 md:py-10">
        {refreshing && (
          <p className="text-center text-xs text-slate-500 print:hidden">Refreshing latest booking details…</p>
        )}

        <FlightTicketView
          booking={booking}
          locale={locale}
          showDebug={isStaff}
          refreshing={refreshing}
          onRefresh={() => void handleRefresh()}
        />

        <div className="space-y-4 print:hidden">
          <FlightBookingTimeline booking={booking} />
        </div>

        <div className="flex flex-wrap justify-center gap-2 print:hidden">
          {canCancelBooking(booking) && (
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={() => void openCancel()}
              disabled={api.loading}
            >
              Cancel Booking
            </Button>
          )}
          {canReleasePnr(booking) && (
            <Button
              variant="outline"
              className="rounded-xl border-amber-300 text-amber-800"
              onClick={() => void handleReleasePnr()}
              disabled={api.loading}
            >
              Release PNR
            </Button>
          )}
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => void handleRefresh()}
            disabled={api.loading || refreshing}
          >
            Refresh Status
          </Button>
        </div>

        {isStaff && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 print:hidden">
            <p className="mb-3 text-sm font-semibold text-slate-800">Admin tools</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void handleAdmin("retry_booking_detail")}>
                Retry Booking Detail
              </Button>
              <Button size="sm" variant="default" onClick={() => void handleAdmin("retry_book")}>
                Retry TripJack Book
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleAdmin("retry_poll")}>
                Retry Poll
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleAdmin("retry_release_pnr")}>
                Retry Release PNR
              </Button>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-500">
                View raw API payloads
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-[10px] text-slate-100">
                {JSON.stringify(
                  {
                    bookingDetailResponse: booking.bookingDetailResponse,
                    getChargesResponse: booking.getChargesResponse,
                    submitAmendmentResponse: booking.submitAmendmentResponse,
                    pollAmendmentResponse: booking.pollAmendmentResponse,
                    releasePnrResponse: booking.releasePnrResponse,
                  },
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        )}

        <p className="text-center text-sm text-slate-500 print:hidden">Booking reference: {bookingId}</p>
        <p className="text-center print:hidden">
          <Link href="/account/flight-bookings" className="text-sm font-medium text-[#1a4fa3] hover:underline">
            My flight bookings
          </Link>
        </p>
      </section>

      <FlightCancelDialog
        open={cancelOpen}
        charges={charges}
        loadingCharges={loadingCharges}
        confirming={confirmingCancel}
        error={cancelError}
        locale={locale}
        onClose={() => setCancelOpen(false)}
        onRetryCharges={() => void openCancel()}
        onConfirm={() => void confirmCancel()}
      />
    </div>
  );
}
