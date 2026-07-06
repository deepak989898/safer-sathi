"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Calendar,
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FlightAirportAutocomplete } from "@/components/flights/flight-airport-autocomplete";
import { flightPrimaryButtonClass } from "@/components/flights/flight-ui";
import {
  formatAirportLabel,
  resolveAirportDisplayLabel,
  validateFlightRoute,
  type FlightAirport,
} from "@/lib/flights/airports";
import { CABIN_CLASSES } from "@/lib/tripjack/config";
import type { FlightSearchParams } from "@/lib/tripjack/types";
import { cn } from "@/lib/utils";

function travelersSummary(params: FlightSearchParams): string {
  const n = params.adults + params.children + params.infants;
  const cabin = params.cabinClass.replace(/_/g, " ");
  return `${n} Traveler${n > 1 ? "s" : ""}, ${cabin}`;
}

interface FlightSearchScreenProps {
  params: FlightSearchParams;
  fromQuery: string;
  toQuery: string;
  fromError?: string | null;
  toError?: string | null;
  loading: boolean;
  onChange: (patch: Partial<FlightSearchParams>) => void;
  onFromQueryChange: (query: string) => void;
  onToQueryChange: (query: string) => void;
  onRouteErrors: (errors: { fromError?: string | null; toError?: string | null }) => void;
  onSwap: () => void;
  onSearch: (route?: { fromCode: string; toCode: string }) => void;
}

/** Commercial jet in flight — reference hero style. */
const FLIGHT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=85";

function TravelerStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg"
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-6 text-center text-sm font-semibold">{value}</span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-lg"
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function FlightSearchScreen({
  params,
  fromQuery,
  toQuery,
  fromError,
  toError,
  loading,
  onChange,
  onFromQueryChange,
  onToQueryChange,
  onRouteErrors,
  onSwap,
  onSearch,
}: FlightSearchScreenProps) {
  const [travelersOpen, setTravelersOpen] = useState(false);

  useEffect(() => {
    if (!fromQuery && params.fromCode) {
      onFromQueryChange(resolveAirportDisplayLabel(params.fromCode));
    }
    if (!toQuery && params.toCode) {
      onToQueryChange(resolveAirportDisplayLabel(params.toCode));
    }
  }, [params.fromCode, params.toCode, fromQuery, toQuery, onFromQueryChange, onToQueryChange]);

  const handleSearchClick = () => {
    const result = validateFlightRoute({
      fromCode: params.fromCode,
      toCode: params.toCode,
      fromQuery,
      toQuery,
    });

    if (!result.ok) {
      onRouteErrors({
        fromError: result.fromError ?? null,
        toError: result.toError ?? null,
      });
      return;
    }

    onRouteErrors({ fromError: null, toError: null });
    onFromQueryChange(resolveAirportDisplayLabel(result.fromCode));
    onToQueryChange(resolveAirportDisplayLabel(result.toCode));
    onSearch({ fromCode: result.fromCode, toCode: result.toCode });
  };

  const handleFromSelect = (airport: FlightAirport) => {
    onChange({ fromCode: airport.iata });
    onFromQueryChange(formatAirportLabel(airport));
    onRouteErrors({ fromError: null });
  };

  const handleToSelect = (airport: FlightAirport) => {
    onChange({ toCode: airport.iata });
    onToQueryChange(formatAirportLabel(airport));
    onRouteErrors({ toError: null });
  };

  const formCard = (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-blue-900/5 sm:p-5">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#1a4fa3] px-3.5 py-1 text-xs font-semibold text-white">
                One Way
              </span>
              <span className="cursor-not-allowed rounded-full bg-slate-100 px-3.5 py-1 text-xs font-medium text-slate-400">
                Round Trip
              </span>
              <span className="cursor-not-allowed rounded-full bg-slate-100 px-3.5 py-1 text-xs font-medium text-slate-400">
                Multi City
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <FlightAirportAutocomplete
                id="flight-from"
                label="From"
                value={params.fromCode}
                query={fromQuery}
                error={fromError}
                placeholder="Delhi, Mumbai, DEL..."
                onQueryChange={onFromQueryChange}
                onCodeChange={(code) => onChange({ fromCode: code })}
                onSelect={handleFromSelect}
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mx-auto h-10 w-10 shrink-0 rounded-full border-blue-100 bg-blue-50 text-[#1a4fa3] hover:bg-blue-100 sm:mb-5"
                onClick={onSwap}
                aria-label="Swap airports"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>

              <FlightAirportAutocomplete
                id="flight-to"
                label="To"
                value={params.toCode}
                query={toQuery}
                error={toError}
                placeholder="Mumbai, Goa, BOM..."
                onQueryChange={onToQueryChange}
                onCodeChange={(code) => onChange({ toCode: code })}
                onSelect={handleToSelect}
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Departure
                </Label>
                <div className="relative mt-1">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="date"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-10"
                    value={params.departureDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => onChange({ departureDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Travelers &amp; Class
                </Label>
                <Popover open={travelersOpen} onOpenChange={setTravelersOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-1 h-11 w-full justify-between rounded-xl border-slate-200 bg-slate-50 px-3 font-normal text-slate-800"
                      />
                    }
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Users className="h-4 w-4 shrink-0 text-[#1a4fa3]" />
                      {travelersSummary(params)}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-4" align="start">
                    <TravelerStepper
                      label="Adults (12+)"
                      value={params.adults}
                      min={1}
                      max={9}
                      onChange={(adults) => onChange({ adults })}
                    />
                    <TravelerStepper
                      label="Children (2–11)"
                      value={params.children}
                      min={0}
                      max={9}
                      onChange={(children) => onChange({ children })}
                    />
                    <TravelerStepper
                      label="Infants (under 2)"
                      value={params.infants}
                      min={0}
                      max={9}
                      onChange={(infants) => onChange({ infants })}
                    />
                    <div className="mt-3 border-t pt-3">
                      <Label className="text-xs text-slate-500">Cabin class</Label>
                      <Select
                        value={params.cabinClass}
                        onValueChange={(v) =>
                          onChange({ cabinClass: v as FlightSearchParams["cabinClass"] })
                        }
                      >
                        <SelectTrigger className="mt-1 h-10 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CABIN_CLASSES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="mt-3 w-full rounded-lg bg-[#1a4fa3]"
                      onClick={() => setTravelersOpen(false)}
                    >
                      Done
                    </Button>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Button
              className={cn(flightPrimaryButtonClass(), "mt-4 h-12")}
              onClick={handleSearchClick}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Searching flights...
                </>
              ) : (
                "Search Flights"
              )}
            </Button>
    </div>
  );

  return (
    <section className="overflow-hidden bg-gradient-to-b from-[#e8f2fc] via-[#f4f8fd] to-[#f4f7fb]">
      <div className="container mx-auto flex max-h-[calc(100dvh-4.5rem)] min-h-[calc(100dvh-4.5rem)] max-w-6xl flex-col px-4 py-4 md:max-h-[calc(100dvh-4rem)] md:min-h-[calc(100dvh-4rem)] md:py-5">
        <div className="grid shrink-0 grid-cols-1 items-center gap-3 md:grid-cols-[1fr_minmax(0,340px)] md:gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-[#1a4fa3] md:text-3xl lg:text-[2rem] lg:leading-tight">
              Find The Best Flight Deals
            </h1>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-600 md:mx-0">
              Book your next adventure — enjoy the best offers on domestic and international
              flights.
            </p>
          </div>

          <div className="flex items-center justify-center md:justify-end">
            <img
              src={FLIGHT_HERO_IMAGE}
              alt="Airplane"
              className="h-28 w-auto max-w-full object-contain drop-shadow-lg sm:h-32 md:h-36 lg:h-40"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto md:mt-4">{formCard}</div>
      </div>
    </section>
  );
}
