"use client";

import { useCallback, useState } from "react";
import type { FlightSearchParams, NormalizedFlightReview } from "@/lib/tripjack/types";

export function useFlightReview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReview = useCallback(
    async (input: {
      priceId: string;
      searchParams?: FlightSearchParams;
      searchTotalFare?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/flights/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error ?? "Flight review failed");
        }
        return json.data as {
          review: NormalizedFlightReview;
          requestBody: { priceIds: string[] };
          proxyEndpoint: string;
          debug?: { rawResponse: unknown };
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Flight review failed";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, setError, fetchReview };
}
