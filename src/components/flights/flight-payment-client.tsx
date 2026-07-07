"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FlightPaymentScreen } from "@/components/flights/flight-payment-screen";
import {
  FlightBookingConfirmationScreen,
  FlightPaymentSuccessScreen,
} from "@/components/flights/flight-status-screens";
import { HideSiteFooter } from "@/components/layout/hide-site-footer";
import { postFlightPaymentSuccessMessage } from "@/lib/bookings/post-payment-navigation";
import { useAuth } from "@/contexts/auth-context";
import { useFlightBookingApi } from "@/hooks/use-flight-booking";
import {
  loadFareValidateSession,
  loadFlightReviewSession,
} from "@/lib/flights/flight-session";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import type { FlightBookingRecord } from "@/lib/flights/types";
import { isFlightTestBookingEnabled } from "@/lib/flights/test-booking";
import { useAppStore } from "@/store/app-store";

type PaymentUiPhase = "pay" | "payment_success" | "booking_status";

export function FlightPaymentClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const api = useFlightBookingApi();

  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [booking, setBooking] = useState<FlightBookingRecord | null>(null);
  const [phase, setPhase] = useState<PaymentUiPhase>("pay");
  const [confirmedBooking, setConfirmedBooking] = useState<FlightBookingRecord | null>(null);

  const isStaff = user ? canShowAdminNav(user.role) : false;
  const testMode = isFlightTestBookingEnabled();

  const session = useMemo(() => {
    const fareSession = loadFareValidateSession();
    const reviewSession = loadFlightReviewSession();

    if (
      !fareSession.normalized ||
      !fareSession.passengers ||
      !fareSession.request ||
      !reviewSession?.normalized
    ) {
      return null;
    }

    return {
      review: reviewSession.normalized,
      validated: fareSession.normalized,
      passengers: fareSession.passengers.passengers,
      delivery: fareSession.passengers.delivery,
      fareValidateRequest: fareSession.request,
      fareValidateResponse: fareSession.fareValidateResponse,
      reviewResponse: reviewSession.rawResponse,
      searchContext: reviewSession.searchContext
        ? {
            fromCode: reviewSession.searchContext.params.fromCode,
            toCode: reviewSession.searchContext.params.toCode,
            departureDate: reviewSession.searchContext.params.departureDate,
          }
        : undefined,
    };
  }, [ready]);

  useEffect(() => {
    if (!session) {
      setSessionError("Booking session expired. Please search again.");
      setReady(true);
      return;
    }

    void (async () => {
      const prepared = await api.prepareBooking({
        review: session.review,
        validated: session.validated,
        passengers: {
          passengers: session.passengers,
          delivery: session.delivery,
        },
        fareValidateRequest: session.fareValidateRequest,
        fareValidateResponse: session.fareValidateResponse,
        reviewResponse: session.reviewResponse,
        searchContext: session.searchContext,
      });

      if (prepared) {
        setBooking(prepared);
        if (isStaff) {
          console.log("[flight-payment] prepared booking:", prepared);
        }
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (phase !== "payment_success") return;
    const timer = window.setTimeout(() => {
      setPhase("booking_status");
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "booking_status" || !confirmedBooking) return;
    if (confirmedBooking.status !== "confirmed") return;

    const timer = window.setTimeout(() => {
      router.push(`/flights/ticket/${confirmedBooking.bookingId}`);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [phase, confirmedBooking, router]);

  const continueAfterPayment = (
    result: {
      booking: FlightBookingRecord;
      manualReview?: boolean;
      bookingFailed?: boolean;
      message?: string;
      testMode?: boolean;
      loginCredentials?: { loginEmail: string; loginPassword: string };
    }
  ) => {
    setConfirmedBooking(result.booking);
    setPhase("payment_success");

    if (result.manualReview && result.bookingFailed) {
      toast.info(
        result.message ??
          "Payment received. Ticket confirmation is pending. Our team will process shortly.",
        { duration: 5000 }
      );
    } else if (result.manualReview) {
      toast.info(
        result.message ?? "Payment received. Issuing your ticket…",
        { duration: 3500 }
      );
    } else if (result.booking.status === "confirmed") {
      toast.success(
        result.testMode ? "Flight booking confirmed (test mode)!" : "Flight booking confirmed!",
        { duration: 2500 }
      );
    } else if (result.testMode) {
      toast.success("Test payment simulated. Continuing booking flow.", { duration: 2500 });
    }

    if (!user && result.loginCredentials) {
      toast.info(postFlightPaymentSuccessMessage(result.booking.bookingId), { duration: 8000 });
    }
  };

  const handlePay = async () => {
    if (!booking || !session) return;

    const primary = session.passengers[0];
    const customerName = `${primary?.fN ?? ""} ${primary?.lN ?? ""}`.trim() || "Guest";

    const result = await api.payForBooking(
      booking,
      {
        name: customerName,
        email: session.delivery.email,
        phone: session.delivery.contact,
      },
      { isStaff }
    );

    if (!result?.booking) return;
    continueAfterPayment(result);
  };

  const handleSimulatePaymentSuccess = async () => {
    if (!booking) return;
    const result = await api.simulatePaymentSuccess(booking, { isStaff });
    if (!result?.booking) return;
    continueAfterPayment({ ...result, testMode: true });
  };

  if (!ready) {
    return (
      <>
        <HideSiteFooter />
        <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb]">
          <p className="text-slate-600">Preparing payment...</p>
        </div>
      </>
    );
  }

  if (sessionError || !session) {
    return (
      <>
        <HideSiteFooter />
        <div className="min-h-screen bg-[#f4f7fb] py-16">
          <div className="container mx-auto max-w-lg px-4 text-center">
            <p className="font-semibold text-slate-900">
              {sessionError ?? "Booking session expired. Please search again."}
            </p>
            <Link href="/flights" className="mt-6 inline-block text-[#1a4fa3] hover:underline">
              Back to flight search
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (phase === "payment_success" && confirmedBooking) {
    return (
      <>
        <HideSiteFooter />
        <FlightPaymentSuccessScreen
          booking={confirmedBooking}
          locale={locale}
          onContinue={() => setPhase("booking_status")}
        />
      </>
    );
  }

  if (phase === "booking_status" && confirmedBooking) {
    return (
      <>
        <HideSiteFooter />
        <FlightBookingConfirmationScreen
          booking={confirmedBooking}
          locale={locale}
          onViewTicket={() => router.push(`/flights/ticket/${confirmedBooking.bookingId}`)}
        />
      </>
    );
  }

  return (
    <>
      <HideSiteFooter />
      <FlightPaymentScreen
        review={session.review}
        validated={session.validated}
        passengers={session.passengers}
        customerEmail={session.delivery.email}
        customerMobile={session.delivery.contact}
        context={
          session.searchContext
            ? {
                params: {
                  fromCode: session.searchContext.fromCode,
                  toCode: session.searchContext.toCode,
                  departureDate: session.searchContext.departureDate,
                  adults: session.passengers.filter((p) => p.pt === "ADULT").length,
                  children: session.passengers.filter((p) => p.pt === "CHILD").length,
                  infants: session.passengers.filter((p) => p.pt === "INFANT").length,
                  cabinClass: "ECONOMY",
                  pft: "REGULAR",
                  isDirectFlight: false,
                  isConnectingFlight: true,
                },
                priceId: session.validated.priceId,
                selectedAt: new Date().toISOString(),
              }
            : null
        }
        booking={booking}
        loading={api.loading}
        error={api.error}
        locale={locale}
        testMode={testMode}
        onPay={() => void handlePay()}
        onSimulatePaymentSuccess={() => void handleSimulatePaymentSuccess()}
      />
    </>
  );
}
