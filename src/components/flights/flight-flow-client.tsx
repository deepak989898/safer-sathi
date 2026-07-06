"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlightDebugPanel } from "@/components/flights/flight-debug-panel";
import { FlightResultsScreen } from "@/components/flights/flight-results-screen";
import { FlightSearchScreen } from "@/components/flights/flight-search-screen";
import { FlightStepBar } from "@/components/flights/flight-ui";
import { useAuth } from "@/contexts/auth-context";
import { useFlightSearch, type FlightSearchDebug } from "@/hooks/use-flight-search";
import {
  defaultFlightSearchParams,
  lightFlights,
  loadFlightSearchSession,
  saveFlightSearchSession,
  saveFlightSelection,
} from "@/lib/flights/flight-session";
import { resolveAirportDisplayLabel } from "@/lib/flights/airports";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import type { FlightSearchParams, NormalizedFlight } from "@/lib/tripjack/types";
import { useAppStore } from "@/store/app-store";

export function FlightFlowClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const { loading, error, setError, searchFlights } = useFlightSearch();

  const [params, setParams] = useState<FlightSearchParams>(() => defaultFlightSearchParams());
  const [fromQuery, setFromQuery] = useState(() =>
    resolveAirportDisplayLabel(defaultFlightSearchParams().fromCode)
  );
  const [toQuery, setToQuery] = useState(() =>
    resolveAirportDisplayLabel(defaultFlightSearchParams().toCode)
  );
  const [fromError, setFromError] = useState<string | null>(null);
  const [toError, setToError] = useState<string | null>(null);
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
      setFromQuery(resolveAirportDisplayLabel(saved.params.fromCode));
      setToQuery(resolveAirportDisplayLabel(saved.params.toCode));
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
    setFromQuery(toQuery);
    setToQuery(fromQuery);
    setFromError(null);
    setToError(null);
  }, [fromQuery, toQuery]);

  const handleSearch = useCallback(
    async (route?: { fromCode: string; toCode: string }) => {
      const searchParams = route ? { ...params, ...route } : params;

      if (!searchParams.departureDate) {
        toast.error("Select a departure date");
        return;
      }

      setError(null);
      setHasSearched(true);

      const result = await searchFlights(searchParams);
      if (!result) return;

      if (route) {
        setParams(searchParams);
      }

      // Strip heavy fields before React state — prevents "Page Unresponsive".
      const flightsLight = lightFlights(result.flights);
      setFlights(flightsLight);
      setOnwardCount(result.onwardCount);
      setMessage(result.message);

      if (showDebug) {
        setDebug({
          requestBody: result.requestBody,
          proxyEndpoint: result.proxyEndpoint,
          payloadShape: result.payloadShape,
          // Never store full TripJack search JSON in React state.
          rawResponse: result.debug ?? { omittedRawResponse: true },
        });
      } else {
        setDebug({});
      }

      // Defer session write so paint is not blocked.
      window.setTimeout(() => {
        saveFlightSearchSession({
          params: searchParams,
          flights: [],
          onwardCount: result.onwardCount,
          message: result.message,
          searchedAt: new Date().toISOString(),
        });
      }, 0);

      if (result.flights.length === 0) {
        toast.info(result.message, { duration: 2500 });
      } else {
        toast.success(result.message, { duration: 2500 });
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [params, searchFlights, setError, showDebug]
  );

  const handleReviewFlight = useCallback(
    (flight: NormalizedFlight) => {
      if (!flight.priceId) {
        toast.error("This fare cannot be reviewed. Please select another flight.");
        return;
      }
      saveFlightSelection({ flight, params });
      router.push("/flights/review");
    },
    [params, router]
  );

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      {hasSearched && <FlightStepBar current="results" />}

      <FlightSearchScreen
        params={params}
        fromQuery={fromQuery}
        toQuery={toQuery}
        fromError={fromError}
        toError={toError}
        loading={loading}
        onChange={handleChange}
        onFromQueryChange={setFromQuery}
        onToQueryChange={setToQuery}
        onRouteErrors={({ fromError: nextFromError, toError: nextToError }) => {
          if (nextFromError !== undefined) setFromError(nextFromError);
          if (nextToError !== undefined) setToError(nextToError);
        }}
        onSwap={handleSwap}
        onSearch={handleSearch}
        compact={hasSearched}
      />

      {hasSearched && (
        <FlightResultsScreen
          flights={flights}
          loading={loading}
          error={error}
          message={message}
          locale={locale}
          onReviewFlight={handleReviewFlight}
        />
      )}

      {showDebug && hasSearched && (debug.rawResponse != null || debug.requestBody != null) && (
        <div className="container mx-auto px-4 pb-10">
          <FlightDebugPanel debug={debug} />
        </div>
      )}
    </div>
  );
}
