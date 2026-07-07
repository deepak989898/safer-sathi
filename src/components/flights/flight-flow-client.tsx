"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlightDebugPanel } from "@/components/flights/flight-debug-panel";
import { FlightResultsScreen } from "@/components/flights/flight-results-screen";
import { FlightSearchScreen } from "@/components/flights/flight-search-screen";
import { HideSiteFooter } from "@/components/layout/hide-site-footer";
import { useAuth } from "@/contexts/auth-context";
import { useFlightSearch, type FlightSearchDebug } from "@/hooks/use-flight-search";
import {
  adjacentDatesForPrefetch,
  type DateFareCache,
  updateDateFareCache,
} from "@/lib/flights/date-fare-cache";
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

type FlightView = "search" | "results";

async function fetchFlightsQuiet(params: FlightSearchParams) {
  const res = await fetch("/api/flights/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!json.success) return null;
  return json.data as {
    onwardCount: number;
    flights: NormalizedFlight[];
    message: string;
  };
}

export function FlightFlowClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const { loading, error, setError, searchFlights } = useFlightSearch();

  const [view, setView] = useState<FlightView>("search");
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
  const [dateFareCache, setDateFareCache] = useState<DateFareCache>({});
  const [dateLoadingMap, setDateLoadingMap] = useState<Record<string, boolean>>({});
  const [debug, setDebug] = useState<FlightSearchDebug>({});
  const prefetchAbort = useRef<AbortController | null>(null);
  const dateFareCacheRef = useRef(dateFareCache);
  dateFareCacheRef.current = dateFareCache;

  const showDebug = user ? canShowAdminNav(user.role) : false;

  const resetToSearchView = useCallback(() => {
    prefetchAbort.current?.abort();
    setView("search");
    setFlights([]);
    setOnwardCount(0);
    setMessage("");
    setDateFareCache({});
    setDateLoadingMap({});
    setDebug({});
    setError(null);
  }, [setError]);

  const applySearchResult = useCallback(
    (
      searchParams: FlightSearchParams,
      result: {
        onwardCount: number;
        flights: NormalizedFlight[];
        message: string;
        requestBody?: unknown;
        proxyEndpoint?: string;
        payloadShape?: { topLevelKeys: string[]; tripInfoKeys: string[] };
        debug?: { rawResponse: unknown };
      }
    ) => {
      const flightsLight = lightFlights(result.flights);
      setFlights(flightsLight);
      setOnwardCount(result.onwardCount);
      setMessage(result.message);
      setDateFareCache((cache) =>
        updateDateFareCache(cache, searchParams.departureDate, flightsLight)
      );

      if (showDebug) {
        setDebug({
          requestBody: result.requestBody,
          proxyEndpoint: result.proxyEndpoint,
          payloadShape: result.payloadShape,
          rawResponse: result.debug ?? { omittedRawResponse: true },
        });
      } else {
        setDebug({});
      }

      window.setTimeout(() => {
        saveFlightSearchSession({
          params: searchParams,
          flights: [],
          onwardCount: result.onwardCount,
          message: result.message,
          searchedAt: new Date().toISOString(),
        });
      }, 0);
    },
    [showDebug]
  );

  const prefetchAdjacentFares = useCallback(async (searchParams: FlightSearchParams) => {
    prefetchAbort.current?.abort();
    const controller = new AbortController();
    prefetchAbort.current = controller;

    for (const date of adjacentDatesForPrefetch(searchParams.departureDate)) {
      if (controller.signal.aborted) break;
      if (dateFareCacheRef.current[date] !== undefined) continue;
      setDateLoadingMap((prev) => ({ ...prev, [date]: true }));
      try {
        const result = await fetchFlightsQuiet({ ...searchParams, departureDate: date });
        if (controller.signal.aborted) break;
        if (result) {
          setDateFareCache((cache) =>
            updateDateFareCache(cache, date, lightFlights(result.flights))
          );
        }
      } catch {
        /* non-blocking prefetch */
      } finally {
        setDateLoadingMap((prev) => ({ ...prev, [date]: false }));
      }
    }
  }, []);

  useEffect(() => {
    resetToSearchView();

    const saved = loadFlightSearchSession();
    if (!saved?.params) return;

    setParams(saved.params);
    setFromQuery(resolveAirportDisplayLabel(saved.params.fromCode));
    setToQuery(resolveAirportDisplayLabel(saved.params.toCode));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on /flights mount
  }, []);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      resetToSearchView();
      const saved = loadFlightSearchSession();
      if (!saved?.params) return;
      setParams(saved.params);
      setFromQuery(resolveAirportDisplayLabel(saved.params.fromCode));
      setToQuery(resolveAirportDisplayLabel(saved.params.toCode));
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [resetToSearchView]);

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

  const runSearch = useCallback(
    async (searchParams: FlightSearchParams) => {
      if (!searchParams.departureDate) {
        toast.error("Select a departure date");
        return;
      }

      setError(null);
      setView("results");

      const result = await searchFlights(searchParams);
      if (!result) {
        setView("search");
        return;
      }

      setParams(searchParams);
      applySearchResult(searchParams, result);
      void prefetchAdjacentFares(searchParams);

      if (result.flights.length === 0) {
        toast.info(result.message, { duration: 2500 });
      } else {
        toast.success(result.message, { duration: 2500 });
      }

      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [applySearchResult, prefetchAdjacentFares, searchFlights, setError]
  );

  const handleSearch = useCallback(
    async (route?: { fromCode: string; toCode: string }) => {
      const searchParams = route ? { ...params, ...route } : params;
      await runSearch(searchParams);
    },
    [params, runSearch]
  );

  const handleSelectDate = useCallback(
    async (date: string) => {
      const searchParams = { ...params, departureDate: date };
      setParams(searchParams);
      setDateLoadingMap((prev) => ({ ...prev, [date]: true }));
      setError(null);

      const result = await searchFlights(searchParams);
      setDateLoadingMap((prev) => ({ ...prev, [date]: false }));

      if (!result) return;

      applySearchResult(searchParams, result);
      void prefetchAdjacentFares(searchParams);
    },
    [applySearchResult, params, prefetchAdjacentFares, searchFlights, setError]
  );

  const handleModify = useCallback(() => {
    resetToSearchView();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [resetToSearchView]);

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
      <HideSiteFooter />
      {view === "search" && (
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
        />
      )}

      {view === "results" && (
        <FlightResultsScreen
          params={params}
          fromQuery={fromQuery}
          toQuery={toQuery}
          flights={flights}
          onwardCount={onwardCount}
          loading={loading}
          error={error}
          message={message}
          locale={locale}
          dateFareCache={dateFareCache}
          dateLoadingMap={dateLoadingMap}
          onReviewFlight={handleReviewFlight}
          onSelectDate={handleSelectDate}
          onModify={handleModify}
        />
      )}

      {showDebug && view === "results" && (debug.rawResponse != null || debug.requestBody != null) && (
        <div className="container mx-auto px-4 pb-10">
          <FlightDebugPanel debug={debug} />
        </div>
      )}
    </div>
  );
}
