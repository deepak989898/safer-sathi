"use client";

import { ArrowRight, Plane } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/i18n";
import type { NormalizedFlight } from "@/lib/tripjack/types";
import type { Locale } from "@/types";

interface FlightCardProps {
  flight: NormalizedFlight;
  locale: Locale;
  onReview?: (flight: NormalizedFlight) => void;
}

export function FlightCard({ flight, locale, onReview }: FlightCardProps) {
  const stopsLabel =
    flight.stops === 0
      ? "Non-stop"
      : flight.stops === 1
        ? "1 Stop"
        : `${flight.stops} Stops`;

  return (
    <Card className="overflow-hidden rounded-2xl border-slate-200 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1a4fa3]">
              <Plane className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-slate-900">
                  {flight.airlineName}
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    {flight.airlineCode} {flight.flightNumber}
                  </span>
                </p>
                <Badge variant="secondary" className="text-xs">
                  {flight.fareIdentifier}
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{flight.refundableType}</p>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-2 md:max-w-md">
            <div className="text-left">
              <p className="text-xl font-bold text-slate-900">{flight.departureTime}</p>
              <p className="text-sm font-medium text-slate-700">{flight.departureAirportCode}</p>
              <p className="truncate text-xs text-slate-500">{flight.departureCity}</p>
            </div>

            <div className="flex flex-col items-center px-2 text-center">
              <p className="text-xs text-slate-500">{flight.durationFormatted}</p>
              <div className="my-1 flex w-full items-center gap-1">
                <span className="h-px flex-1 bg-slate-300" />
                <Plane className="h-3 w-3 rotate-90 text-slate-400" />
                <span className="h-px flex-1 bg-slate-300" />
              </div>
              <p className="text-xs font-medium text-slate-600">{stopsLabel}</p>
              {flight.stopCities.length > 0 && (
                <p className="mt-0.5 max-w-[100px] truncate text-[10px] text-slate-400">
                  via {flight.stopCities.join(", ")}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="text-xl font-bold text-slate-900">{flight.arrivalTime}</p>
              <p className="text-sm font-medium text-slate-700">{flight.arrivalAirportCode}</p>
              <p className="truncate text-xs text-slate-500">{flight.arrivalCity}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-stretch border-t border-slate-100 pt-4 md:w-44 md:border-l md:border-t-0 md:pl-5 md:pt-0">
            <p className="text-2xl font-bold text-[#1a4fa3]">
              {formatCurrency(flight.totalFare, locale)}
            </p>
            <p className="text-xs text-slate-500">
              Base {formatCurrency(flight.baseFare, locale)} + taxes{" "}
              {formatCurrency(flight.taxesAndFees, locale)}
            </p>
            <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
              <p>Cabin: {flight.cabinBaggage}</p>
              <p>Check-in: {flight.checkinBaggage}</p>
              {flight.seatsRemaining != null && (
                <p className="text-amber-700">{flight.seatsRemaining} seat(s) left</p>
              )}
            </div>
            {onReview && flight.priceId && (
              <Button
                className="mt-3 w-full rounded-xl bg-[#1a4fa3] hover:bg-[#16408a]"
                size="sm"
                onClick={() => onReview(flight)}
              >
                Review Fare / Continue
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
