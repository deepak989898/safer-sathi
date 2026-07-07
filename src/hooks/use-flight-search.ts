"use client";

import { useCallback, useState } from "react";
import type { FlightSearchParams, NormalizedFlight } from "@/lib/tripjack/types";

export function useFlightSearch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchFlights = useCallback(async (params: FlightSearchParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error ?? "Flight search failed");
      }
      return json.data as {
        count: number;
        onwardCount: number;
        flights: NormalizedFlight[];
        message: string;
        requestBody?: unknown;
        proxyEndpoint?: string;
        payloadShape?: { topLevelKeys: string[]; tripInfoKeys: string[] };
        debug?: { rawResponse: unknown };
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Flight search failed";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, setError, searchFlights };
}

export type FlightSearchDebug = {
  rawResponse?: unknown;
  requestBody?: unknown;
  proxyEndpoint?: string;
  payloadShape?: { topLevelKeys: string[]; tripInfoKeys: string[] };
};
