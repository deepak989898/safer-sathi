"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { FlightDebugPanel } from "@/components/flights/flight-debug-panel";
import { FlightResultsScreen } from "@/components/flights/flight-results-screen";
import { FlightSearchScreen } from "@/components/flights/flight-search-screen";
import { useAuth } from "@/contexts/auth-context";
import { useFlightSearch, type FlightSearchDebug } from "@/hooks/use-flight-search";
import {
  defaultFlightSearchParams,
  loadFlightSearchSession,
  saveFlightSearchSession,
} from "@/lib/flights/session";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import type { FlightSearchParams, NormalizedFlight } from "@/lib/tripjack/types";
import { useAppStore } from "@/store/app-store";

export function FlightFlowClient() {
  const { locale } = useAppStore();
  const { user } = useAuth();
  const { loading, error, setError, searchFlights } = useFlightSearch();

  const [params, setParams] = useState<FlightSearchParams>(defaultFlightSearchParams);
  const [flights, setFlights] = useState<NormalizedFlight[]>([]);
  const [onwardCount, setOnwardCount] = useState(0);
  const [message, setMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [debug, setDebug] = useState<FlightSearchDebug>({});

  const showDebug = user ? canShowAdminNav(user.role) : false;

  useEffect(() => {
    const saved = loadFlightSearchSession();
    if (saved) {
      setParams(saved.params);
      setFlights(saved.flights);
      setOnwardCount(saved.onwardCount);
      setMessage(saved.message);
      setHasSearched(true);
    }
  }, []);

  const handleChange = useCallback((patch: Partial<FlightSearchParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSwap = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      fromCode: prev.toCode,
      toCode: prev.fromCode,
    }));
  }, []);

  const handleSearch = useCallback(async () => {
    if (params.fromCode.length !== 3 || params.toCode.length !== 3) {
      toast.error("Enter valid 3-letter IATA airport codes");
      return;
    }
    if (params.fromCode === params.toCode) {
      toast.error("From and To airports must be different");
      return;
    }
    if (!params.departureDate) {
      toast.error("Select a departure date");
      return;
    }

    setError(null);
    setHasSearched(true);

    const result = await searchFlights(params);
    if (!result) return;

    setFlights(result.flights);
    setOnwardCount(result.onwardCount);
    setMessage(result.message);
    setDebug({
      rawResponse: result.debug?.rawResponse ?? result,
      requestBody: result.requestBody,
      proxyEndpoint: result.proxyEndpoint,
      payloadShape: result.payloadShape,
    });

    saveFlightSearchSession({
      params,
      flights: result.flights,
      onwardCount: result.onwardCount,
      message: result.message,
      searchedAt: new Date().toISOString(),
    });

    if (result.flights.length === 0) {
      toast.info(result.message);
    } else {
      toast.success(result.message);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [params, searchFlights, setError]);

  return (
    <>
      <FlightSearchScreen
        params={params}
        loading={loading}
        onChange={handleChange}
        onSwap={handleSwap}
        onSearch={handleSearch}
      />

      {hasSearched && (
        <FlightResultsScreen
          params={params}
          flights={flights}
          onwardCount={onwardCount}
          loading={loading}
          error={error}
          message={message}
          locale={locale}
        />
      )}

      {showDebug && hasSearched && (debug.rawResponse != null || debug.requestBody != null) && (
        <div className="container mx-auto px-4 pb-10">
          <FlightDebugPanel debug={debug} />
        </div>
      )}
    </>
  );
}
