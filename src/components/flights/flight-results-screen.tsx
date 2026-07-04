"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Plane } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { FlightCard } from "@/components/flights/flight-card";
import {
  FlightFiltersMobileBar,
  FlightFiltersSidebar,
} from "@/components/flights/flight-filters-sidebar";
import { FlightPagination } from "@/components/flights/flight-pagination";
import { FlightSoftCard } from "@/components/flights/flight-ui";
import {
  applyFlightFilters,
  buildFlightFilterMeta,
  countActiveFilters,
  initFiltersFromFlights,
  paginateFlights,
  type FlightFilters,
} from "@/lib/flights/filters";
import { formatCurrency } from "@/lib/i18n";
import type { FlightSearchParams, NormalizedFlight } from "@/lib/tripjack/types";
import type { Locale } from "@/types";

interface FlightResultsScreenProps {
  params: FlightSearchParams;
  flights: NormalizedFlight[];
  onwardCount: number;
  loading: boolean;
  error: string | null;
  message: string;
  locale: Locale;
  onReviewFlight?: (flight: NormalizedFlight) => void;
  onSelectDate?: (date: string) => void;
}

function buildDateStrip(centerDate: string): string[] {
  const base = new Date(`${centerDate}T12:00:00`);
  if (Number.isNaN(base.getTime())) return [centerDate];
  const dates: string[] = [];
  for (let offset = -3; offset <= 3; offset += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + offset);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function formatStripDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
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

export function FlightResultsScreen({
  params,
  flights,
  onwardCount,
  loading,
  error,
  message,
  locale,
  onReviewFlight,
  onSelectDate,
}: FlightResultsScreenProps) {
  const dateStrip = useMemo(
    () => buildDateStrip(params.departureDate),
    [params.departureDate]
  );
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
  const cheapest = filteredFlights[0]?.totalFare;

  const handleFilterChange = (patch: Partial<FlightFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters(initFiltersFromFlights(flights));
    setPage(1);
  };

  const routeLabel = `${params.fromCode} → ${params.toCode}`;
  const paxLabel = `${params.adults} Adult${params.adults > 1 ? "s" : ""}${
    params.children ? `, ${params.children} Child` : ""
  }${params.infants ? `, ${params.infants} Infant` : ""}`;

  if (!loading && !error && flights.length === 0 && !message) {
    return null;
  }

  return (
    <section className="border-t border-blue-50 bg-[#f4f7fb] py-0">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 md:text-2xl">{routeLabel}</h2>
              <p className="text-sm text-slate-600">
                {params.departureDate} · {params.cabinClass.replace(/_/g, " ")} · {paxLabel}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 px-4 py-2 text-right">
              <p className="text-xs font-medium text-slate-500">
                {loading
                  ? "Searching..."
                  : error
                    ? "Search failed"
                    : `${filteredFlights.length} of ${onwardCount} flights`}
              </p>
              {!loading && !error && cheapest != null && (
                <p className="text-sm font-bold text-[#1a4fa3]">
                  From {formatCurrency(cheapest, locale)}
                </p>
              )}
            </div>
          </div>

          {/* Date strip — selects date and reuses existing search */}
          <div className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
            {dateStrip.map((date) => {
              const active = date === params.departureDate;
              return (
                <button
                  key={date}
                  type="button"
                  disabled={!onSelectDate || loading}
                  onClick={() => onSelectDate?.(date)}
                  className={`min-w-[92px] shrink-0 rounded-2xl border px-3 py-2 text-left transition ${
                    active
                      ? "border-[#1a4fa3] bg-[#1a4fa3] text-white shadow-md"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                  }`}
                >
                  <p className={`text-[11px] font-medium ${active ? "text-blue-100" : "text-slate-500"}`}>
                    {formatStripDay(date)}
                  </p>
                  <p className={`mt-0.5 text-xs font-bold ${active ? "text-white" : "text-[#1a4fa3]"}`}>
                    {active && cheapest != null ? formatCurrency(cheapest, locale) : "Search"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
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
                  "Try a different date, route, or enable connecting flights in your search."}
              </p>
            </div>
          </FlightSoftCard>
        )}

        {!loading && !error && flights.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-24">
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
                  <span className="text-slate-400"> · use filters to change</span>
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
