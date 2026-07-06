"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Pencil, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { FlightCard } from "@/components/flights/flight-card";
import { FlightDateFareStrip } from "@/components/flights/flight-date-fare-strip";
import {
  FlightFiltersMobileBar,
  FlightFiltersSidebar,
} from "@/components/flights/flight-filters-sidebar";
import { FlightPagination } from "@/components/flights/flight-pagination";
import { FlightSoftCard } from "@/components/flights/flight-ui";
import { findAirportByIata } from "@/lib/flights/airports";
import type { DateFareCache } from "@/lib/flights/date-fare-cache";
import {
  applyFlightFilters,
  buildFlightFilterMeta,
  countActiveFilters,
  initFiltersFromFlights,
  paginateFlights,
  type FlightFilters,
} from "@/lib/flights/filters";
import type { FlightSearchParams, NormalizedFlight } from "@/lib/tripjack/types";
import type { Locale } from "@/types";

interface FlightResultsScreenProps {
  params: FlightSearchParams;
  fromQuery: string;
  toQuery: string;
  flights: NormalizedFlight[];
  onwardCount: number;
  loading: boolean;
  error: string | null;
  message: string;
  locale: Locale;
  dateFareCache: DateFareCache;
  dateLoadingMap?: Record<string, boolean>;
  onReviewFlight?: (flight: NormalizedFlight) => void;
  onSelectDate: (date: string) => void;
  onModify: () => void;
}

function FlightCardSkeleton() {
  return (
    <FlightSoftCard>
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-12 w-28" />
      </div>
    </FlightSoftCard>
  );
}

function formatResultDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function FlightResultsScreen({
  params,
  fromQuery,
  toQuery,
  flights,
  onwardCount,
  loading,
  error,
  message,
  locale,
  dateFareCache,
  dateLoadingMap,
  onReviewFlight,
  onSelectDate,
  onModify,
}: FlightResultsScreenProps) {
  const [filters, setFilters] = useState<FlightFilters>(() => initFiltersFromFlights(flights));
  const [page, setPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const meta = useMemo(() => buildFlightFilterMeta(flights), [flights]);

  useEffect(() => {
    setFilters(initFiltersFromFlights(flights));
    setPage(1);
  }, [flights]);

  const filteredFlights = useMemo(
    () => applyFlightFilters(flights, filters),
    [flights, filters]
  );

  const pagination = useMemo(
    () => paginateFlights(filteredFlights, page),
    [filteredFlights, page]
  );

  const activeFilterCount = countActiveFilters(filters, meta);

  const fromAirport = findAirportByIata(params.fromCode);
  const toAirport = findAirportByIata(params.toCode);
  const travelerCount = params.adults + params.children + params.infants;
  const cabinLabel = params.cabinClass.replace(/_/g, " ");

  const handleFilterChange = (patch: Partial<FlightFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(initFiltersFromFlights(flights));
    setPage(1);
  };

  return (
    <section className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
                {params.fromCode} → {params.toCode}
              </h1>
              <p className="mt-0.5 text-sm text-slate-600">
                {fromAirport?.city ?? fromQuery} to {toAirport?.city ?? toQuery}
                {fromAirport?.country && toAirport?.country
                  ? ` · ${fromAirport.country} to ${toAirport.country}`
                  : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatResultDate(params.departureDate)} · {travelerCount} Traveler
                {travelerCount > 1 ? "s" : ""} · {cabinLabel}
                {!loading && !error && onwardCount > 0 && (
                  <span className="text-slate-400"> · {onwardCount} flights</span>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full border-[#1a4fa3] text-[#1a4fa3] hover:bg-blue-50"
              onClick={onModify}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Modify Search
            </Button>
          </div>

          <div className="mt-4">
            <FlightDateFareStrip
              selectedDate={params.departureDate}
              locale={locale}
              loading={loading}
              dateFareCache={dateFareCache}
              loadingDates={dateLoadingMap}
              onSelectDate={onSelectDate}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-6">
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <FlightCardSkeleton key={i} />
            ))}
          </div>
        )}

        {error && !loading && (
          <Card className="rounded-2xl border-red-200 bg-red-50">
            <CardContent className="flex items-start gap-3 pt-6">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Could not load flights</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && flights.length === 0 && (
          <FlightSoftCard>
            <div className="flex flex-col items-center py-14 text-center">
              <Plane className="mb-3 h-12 w-12 text-slate-300" />
              <p className="font-semibold text-slate-900">No flights found</p>
              <p className="mt-2 max-w-md text-sm text-slate-600">
                {message ||
                  "Try a different date from the calendar above, or modify your search."}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 rounded-full"
                onClick={onModify}
              >
                Modify Search
              </Button>
            </div>
          </FlightSoftCard>
        )}

        {!loading && !error && flights.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-20">
                <FlightFiltersSidebar
                  filters={filters}
                  meta={meta}
                  locale={locale}
                  activeCount={activeFilterCount}
                  onChange={handleFilterChange}
                  onReset={handleResetFilters}
                />
              </div>
            </aside>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FlightFiltersMobileBar
                  activeCount={activeFilterCount}
                  onOpen={() => setMobileFiltersOpen(true)}
                />
                <p className="text-xs font-medium text-slate-500">
                  Sort:{" "}
                  <span className="text-slate-800">
                    {filters.sortBy === "price_asc"
                      ? "Price (low to high)"
                      : filters.sortBy === "price_desc"
                        ? "Price (high to low)"
                        : filters.sortBy === "duration_asc"
                          ? "Duration"
                          : filters.sortBy === "departure_asc"
                            ? "Departure"
                            : "Recommended"}
                  </span>
                </p>
              </div>

              {filteredFlights.length === 0 ? (
                <FlightSoftCard>
                  <div className="py-10 text-center">
                    <p className="font-semibold text-slate-900">No flights match your filters</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Try clearing filters or widening your price range.
                    </p>
                  </div>
                </FlightSoftCard>
              ) : (
                <>
                  {pagination.items.map((flight) => (
                    <FlightCard
                      key={`${flight.priceId}-${flight.flightNumber}-${flight.departureTime}-${flight.fareIdentifier}`}
                      flight={flight}
                      locale={locale}
                      onReview={onReviewFlight}
                    />
                  ))}

                  <FlightPagination
                    page={pagination.page}
                    totalPages={pagination.totalPages}
                    total={pagination.total}
                    startIndex={pagination.startIndex}
                    endIndex={pagination.endIndex}
                    onPageChange={setPage}
                  />
                </>
              )}
            </div>
          </div>
        )}

        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetContent side="left" className="w-full max-w-sm overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter flights</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FlightFiltersSidebar
                filters={filters}
                meta={meta}
                locale={locale}
                activeCount={activeFilterCount}
                onChange={handleFilterChange}
                onReset={handleResetFilters}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </section>
  );
}
