"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FlightReviewScreen } from "@/components/flights/flight-review-screen";
import { useAuth } from "@/contexts/auth-context";
import { useFlightReview } from "@/hooks/use-flight-review";
import {
  loadFlightSelection,
  saveFlightReviewSession,
  type FlightSearchContext,
} from "@/lib/flights/flight-session";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { extractTripJackBookingId } from "@/lib/tripjack/extract-booking-id";
import type { NormalizedFlightReview } from "@/lib/tripjack/types";
import { useAppStore } from "@/store/app-store";

export function FlightReviewClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const { loading, error, setError, fetchReview } = useFlightReview();

  const [context, setContext] = useState<FlightSearchContext | null>(null);
  const [review, setReview] = useState<NormalizedFlightReview | null>(null);
  const [ready, setReady] = useState(false);

  const isStaff = user ? canShowAdminNav(user.role) : false;

  const loadReview = useCallback(async () => {
    const selection = loadFlightSelection();
    if (!selection.price?.priceId || !selection.context) {
      setContext(null);
      setReview(null);
      setReady(true);
      return;
    }

    setContext(selection.context);

    if (isStaff) {
      console.log("[flight-review] selected priceId:", selection.price.priceId);
    }

    const result = await fetchReview({
      priceId: selection.price.priceId,
      searchParams: selection.context.params,
      searchTotalFare: selection.context.searchTotalFare,
    });

    if (!result) return;

    setReview(result.review);

    if (isStaff) {
      console.log("[flight-review] bookingId:", result.review.bookingId);
      console.log("[flight-review] request body:", result.requestBody);
      console.log("[flight-review] raw review response:", result.debug?.rawResponse ?? result);
      console.log("[flight-review] normalized review:", result.review);
    }
  }, [fetchReview, isStaff]);

  useEffect(() => {
    void loadReview().finally(() => setReady(true));
  }, [loadReview]);

  const handleRetry = () => {
    setError(null);
    void loadReview();
  };

  const handleContinue = () => {
    if (!review) return;
    const selection = loadFlightSelection();
    const rawResponse = review.rawReviewResponse;
    const bookingId = review.bookingId || extractTripJackBookingId(rawResponse);

    const normalized = { ...review, bookingId };

    saveFlightReviewSession({
      rawResponse,
      normalized,
      searchContext: selection.context ?? context,
    });

    if (isStaff) {
      console.log("[flight-review] bookingId:", bookingId);
      console.log("[flight-review] saved session, navigating to passengers");
    }
    router.push("/flights/passengers");
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading review...</p>
      </div>
    );
  }

  return (
    <FlightReviewScreen
      review={review}
      context={context}
      loading={loading}
      error={error}
      locale={locale}
      onRetry={handleRetry}
      onContinue={handleContinue}
    />
  );
}
