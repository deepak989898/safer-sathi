"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlightPassengersScreen } from "@/components/flights/flight-passengers-screen";
import { useAuth } from "@/contexts/auth-context";
import { useFlightFareValidate } from "@/hooks/use-flight-fare-validate";
import {
  loadFlightReviewSession,
  saveFareValidateSession,
  type FlightPassengersSession,
} from "@/lib/flights/flight-session";
import { buildFareValidateRequest, buildEmptyPassengerRows } from "@/lib/tripjack/build-fare-validate";
import { isFutureDateOfBirth } from "@/lib/phone-country-codes";
import { extractTripJackBookingId } from "@/lib/tripjack/extract-booking-id";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import type {
  FlightPassengerDeliveryForm,
  FlightPassengerFormRow,
  NormalizedFareValidate,
  NormalizedFlightReview,
} from "@/lib/tripjack/types";
import type { FlightSearchContext } from "@/lib/flights/flight-session";
import { useAppStore } from "@/store/app-store";

export function FlightPassengersClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const { loading, error, setError, validateFare } = useFlightFareValidate();

  const [review, setReview] = useState<NormalizedFlightReview | null>(null);
  const [context, setContext] = useState<FlightSearchContext | null>(null);
  const [bookingId, setBookingId] = useState("");
  const [passengers, setPassengers] = useState<FlightPassengerFormRow[]>([]);
  const [delivery, setDelivery] = useState<FlightPassengerDeliveryForm>({
    email: "",
    contact: "",
    countryCode: "91",
  });
  const [validated, setValidated] = useState<NormalizedFareValidate | null>(null);
  const [ready, setReady] = useState(false);

  const isStaff = user ? canShowAdminNav(user.role) : false;

  const bookingIdError = useMemo(() => {
    if (!ready) return null;
    if (!bookingId) {
      return "Booking ID missing from Review response. Cannot validate fare.";
    }
    return null;
  }, [bookingId, ready]);

  useEffect(() => {
    const session = loadFlightReviewSession();
    if (!session) {
      setReady(true);
      return;
    }

    setReview(session.normalized);
    setContext(session.searchContext);

    const id =
      session.bookingId ||
      session.normalized.bookingId ||
      extractTripJackBookingId(session.rawResponse);
    setBookingId(id);

    const params = session.searchContext?.params;
    if (params) {
      setPassengers(
        buildEmptyPassengerRows({
          adults: params.adults,
          children: params.children,
          infants: params.infants,
        })
      );
    }

    if (user?.email) {
      setDelivery((d) => ({ ...d, email: user.email }));
    }
    if (user?.phone) {
      const digits = user.phone.replace(/\D/g, "");
      setDelivery((d) => ({
        ...d,
        countryCode: digits.length > 10 ? digits.slice(0, digits.length - 10) : d.countryCode,
        contact: digits.slice(-10),
      }));
    }

    if (isStaff) {
      console.log("[flight-passengers] bookingId from review:", id);
    }

    setReady(true);
  }, [user, isStaff]);

  const handlePassengerChange = (index: number, patch: Partial<FlightPassengerFormRow>) => {
    setPassengers((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const handleDeliveryChange = (patch: Partial<FlightPassengerDeliveryForm>) => {
    setDelivery((d) => ({ ...d, ...patch }));
  };

  const runValidate = useCallback(async () => {
    if (!review || !bookingId) return;

    for (const p of passengers) {
      if (!p.fN.trim() || !p.lN.trim()) {
        toast.error("Please enter first and last name for all passengers");
        return;
      }
    }
    if (!delivery.email.trim() || !delivery.contact.trim()) {
      toast.error("Please enter email and mobile number");
      return;
    }
    if (delivery.contact.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }

    for (const p of passengers) {
      if (p.dateOfBirth && isFutureDateOfBirth(p.dateOfBirth)) {
        toast.error("Date of birth cannot be in the future");
        return;
      }
    }

    const passengersSession: FlightPassengersSession = { passengers, delivery };
    const request = buildFareValidateRequest({ bookingId, passengers, delivery });

    if (isStaff) {
      console.log("[flight-passengers] fare validate request:", request);
    }

    const result = await validateFare(request, review.totalFare);
    if (!result) return;

    setValidated(result.validated);

    if (isStaff) {
      console.log("[flight-passengers] raw fare validate response:", result.debug?.rawResponse);
      console.log("[flight-passengers] normalized fare validate:", result.validated);
    }

    saveFareValidateSession({
      request,
      rawResponse: result.debug?.rawResponse ?? result.validated.rawFareValidateResponse,
      normalized: result.validated,
      passengers: passengersSession,
    });

    toast.success("Fare validated successfully.", { duration: 2500 });

    if (result.validated.fareChanged) {
      toast.info(
        result.validated.fareAlertMessage ??
          "Fare updated. Please review the latest fare before payment.",
        { duration: 3500 }
      );
    }
  }, [review, bookingId, passengers, delivery, validateFare, isStaff]);

  const handleRetry = () => {
    setError(null);
    void runValidate();
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading passenger form...</p>
      </div>
    );
  }

  return (
    <FlightPassengersScreen
      review={review}
      context={context}
      bookingId={bookingId}
      passengers={passengers}
      delivery={delivery}
      validated={validated}
      loading={loading}
      error={error}
      bookingIdError={bookingIdError}
      locale={locale}
      onPassengerChange={handlePassengerChange}
      onDeliveryChange={handleDeliveryChange}
      onValidate={runValidate}
      onRetry={handleRetry}
      onProceedToPayment={() => router.push("/flights/payment")}
    />
  );
}
