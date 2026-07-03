"use client";

import { AlertCircle, Plane } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FlightCard } from "@/components/flights/flight-card";
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
}

function FlightCardSkeleton() {
  return (
    <Card className="rounded-2xl border-slate-200">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
        <Skeleton className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-12 w-28" />
      </CardContent>
    </Card>
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
}: FlightResultsScreenProps) {
  const routeLabel = `${params.fromCode} → ${params.toCode}`;
  const paxLabel = `${params.adults} Adult${params.adults > 1 ? "s" : ""}${
    params.children ? `, ${params.children} Child` : ""
  }${params.infants ? `, ${params.infants} Infant` : ""}`;

  if (!loading && !error && flights.length === 0 && !message) {
    return null;
  }

  return (
    <section className="border-t bg-slate-100 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 md:text-2xl">{routeLabel}</h2>
            <p className="text-sm text-slate-600">
              {params.departureDate} · {params.cabinClass.replace(/_/g, " ")} · {paxLabel}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? "Searching..."
                : error
                  ? "Search failed"
                  : `${onwardCount} flight(s) · sorted by lowest fare`}
            </p>
          </div>
        </div>

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
          <Card className="rounded-2xl border-slate-200">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Plane className="mb-3 h-12 w-12 text-slate-300" />
              <p className="font-semibold text-slate-900">No flights found</p>
              <p className="mt-2 max-w-md text-sm text-slate-600">
                {message ||
                  "Try a different date, route, or enable connecting flights in your search."}
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && !error && flights.length > 0 && (
          <div className="space-y-4">
            {flights.map((flight) => (
              <FlightCard
                key={`${flight.priceId}-${flight.flightNumber}-${flight.departureTime}`}
                flight={flight}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
