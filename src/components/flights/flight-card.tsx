"use client";

import { useState } from "react";
import { Briefcase, ChevronDown, ChevronUp, Luggage, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AirlineLogo } from "@/components/flights/airline-logo";
import {
  FlightRouteStrip,
  FlightSoftCard,
  flightPrimaryButtonClass,
} from "@/components/flights/flight-ui";
import { formatCurrency } from "@/lib/i18n";
import type { NormalizedFlight } from "@/lib/tripjack/types";
import type { Locale } from "@/types";
import { cn } from "@/lib/utils";

interface FlightCardProps {
  flight: NormalizedFlight;
  locale: Locale;
  onReview?: (flight: NormalizedFlight) => void;
}

export function FlightCard({ flight, locale, onReview }: FlightCardProps) {
  const [open, setOpen] = useState(false);

  const stopsLabel =
    flight.stops === 0
      ? "Non Stop"
      : flight.stops === 1
        ? "1 Stop"
        : `${flight.stops} Stops`;

  return (
    <FlightSoftCard className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <AirlineLogo code={flight.airlineCode} name={flight.airlineName} size={48} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{flight.airlineName}</p>
            <p className="text-sm text-slate-500">
              {flight.airlineCode} {flight.flightNumber}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge
                variant="secondary"
                className="rounded-full bg-emerald-50 text-[10px] font-medium text-emerald-700"
              >
                {flight.refundableType || "Fare"}
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full bg-blue-50 text-[10px] font-medium text-[#1a4fa3]"
              >
                {flight.fareIdentifier}
              </Badge>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 md:max-w-md">
          <FlightRouteStrip
            departureTime={flight.departureTime}
            arrivalTime={flight.arrivalTime}
            fromCode={flight.departureAirportCode}
            toCode={flight.arrivalAirportCode}
            fromCity={flight.departureCity}
            toCity={flight.arrivalCity}
            duration={flight.durationFormatted}
            stopsLabel={stopsLabel}
          />
        </div>

        <div className="flex shrink-0 flex-col items-stretch border-t border-slate-100 pt-4 md:w-44 md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <p className="text-2xl font-bold text-[#1a4fa3]">
            {formatCurrency(flight.totalFare, locale)}
          </p>
          <p className="text-xs text-slate-500">per adult · incl. taxes</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 text-left text-xs font-semibold text-[#1a4fa3] hover:underline"
            onClick={() => setOpen((v) => !v)}
          >
            View Details
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {onReview && flight.priceId && (
            <Button
              className={cn(flightPrimaryButtonClass(), "mt-3 h-10 text-sm")}
              size="sm"
              onClick={() => onReview(flight)}
            >
              Continue to Review
            </Button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-4 md:px-5">
          <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
            <div className="flex items-start gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-100">
              <Briefcase className="mt-0.5 h-4 w-4 text-[#1a4fa3]" />
              <div>
                <p className="font-semibold text-slate-900">Cabin baggage</p>
                <p className="text-xs text-slate-500">{flight.cabinBaggage || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-100">
              <Luggage className="mt-0.5 h-4 w-4 text-[#1a4fa3]" />
              <div>
                <p className="font-semibold text-slate-900">Check-in</p>
                <p className="text-xs text-slate-500">{flight.checkinBaggage || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-100">
              <RefreshCw className="mt-0.5 h-4 w-4 text-[#1a4fa3]" />
              <div>
                <p className="font-semibold text-slate-900">Refund</p>
                <p className="text-xs text-slate-500">{flight.refundableType || "—"}</p>
              </div>
            </div>
          </div>
          {flight.seatsRemaining != null && (
            <p className="mt-3 text-xs font-medium text-amber-700">
              {flight.seatsRemaining} seat(s) left at this fare
            </p>
          )}
        </div>
      )}
    </FlightSoftCard>
  );
}
