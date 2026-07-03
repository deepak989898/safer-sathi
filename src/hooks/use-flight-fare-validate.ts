"use client";

import { useCallback, useState } from "react";
import type { FareValidateRequest, NormalizedFareValidate } from "@/lib/tripjack/types";

export function useFlightFareValidate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFare = useCallback(
    async (request: FareValidateRequest, previousTotalFare?: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/flights/fare-validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...request, previousTotalFare }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error ?? "Fare validate failed");
        }
        return json.data as {
          validated: NormalizedFareValidate;
          proxyEndpoint: string;
          debug?: { rawResponse: unknown };
        };
      } catch (e) {
        const message = e instanceof Error ? e.message : "Fare validate failed";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, error, setError, validateFare };
}
