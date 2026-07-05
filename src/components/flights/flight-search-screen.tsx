"use client";

import { useState } from "react";
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
import { flightPrimaryButtonClass } from "@/components/flights/flight-ui";
import { CABIN_CLASSES } from "@/lib/tripjack/config";
import type { FlightSearchParams } from "@/lib/tripjack/types";
import { cn } from "@/lib/utils";

/** Side-view commercial jet — full aircraft visible (object-contain). */
const FLIGHT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1583608205776-bfd35f0d9a83?auto=format&fit=crop&w=1200&q=85";

const POPULAR_AIRPORTS: Record<string, string> = {
  DEL: "Delhi",
  BOM: "Mumbai",
  BLR: "Bengaluru",
  MAA: "Chennai",
  HYD: "Hyderabad",
  CCU: "Kolkata",
  GOI: "Goa",
  PNQ: "Pune",
  AMD: "Ahmedabad",
  COK: "Kochi",
};

function airportHint(code: string): string {
  const city = POPULAR_AIRPORTS[code.toUpperCase()];
  return city ? `${city} (${code.toUpperCase()})` : code.toUpperCase() || "IATA code";
}

function travelersSummary(params: FlightSearchParams): string {
  const n = params.adults + params.children + params.infants;
  const cabin = params.cabinClass.replace(/_/g, " ");
  return `${n} Traveler${n > 1 ? "s" : ""}, ${cabin}`;
}

interface FlightSearchScreenProps {
  params: FlightSearchParams;
  loading: boolean;
  onChange: (patch: Partial<FlightSearchParams>) => void;
  onSwap: () => void;
  onSearch: () => void;
  /** After first search — compact bar only (no hero image). */
  compact?: boolean;
}

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
  loading,
  onChange,
  onSwap,
  onSearch,
  compact = false,
}: FlightSearchScreenProps) {
  const [travelersOpen, setTravelersOpen] = useState(false);

  const formCard = (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-blue-900/5 sm:p-5",
        compact && "shadow-md"
      )}
    >
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
              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  From
                </Label>
                <Input
                  className="mt-1 h-11 rounded-xl border-slate-200 bg-slate-50 text-base font-bold uppercase"
                  placeholder="DEL"
                  maxLength={3}
                  value={params.fromCode}
                  onChange={(e) =>
                    onChange({ fromCode: e.target.value.toUpperCase().slice(0, 3) })
                  }
                />
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {airportHint(params.fromCode)}
                </p>
              </div>

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

              <div>
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  To
                </Label>
                <Input
                  className="mt-1 h-11 rounded-xl border-slate-200 bg-slate-50 text-base font-bold uppercase"
                  placeholder="BOM"
                  maxLength={3}
                  value={params.toCode}
                  onChange={(e) =>
                    onChange({ toCode: e.target.value.toUpperCase().slice(0, 3) })
                  }
                />
                <p className="mt-0.5 truncate text-[11px] text-slate-400">
                  {airportHint(params.toCode)}
                </p>
              </div>
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
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-1 h-11 w-full justify-between rounded-xl border-slate-200 bg-slate-50 px-3 font-normal text-slate-800"
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Users className="h-4 w-4 shrink-0 text-[#1a4fa3]" />
                        {travelersSummary(params)}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    </Button>
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
              onClick={onSearch}
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

  if (compact) {
    return (
      <section className="border-b border-slate-200/80 bg-[#f4f7fb]">
        <div className="container mx-auto max-w-6xl px-4 py-4">{formCard}</div>
      </section>
    );
  }

  return (
    <section className="bg-gradient-to-b from-[#e8f2fc] via-[#f4f8fd] to-[#f4f7fb]">
      <div className="container mx-auto flex min-h-[calc(100dvh-8.5rem)] max-w-6xl flex-col px-4 py-5 lg:min-h-[calc(100dvh-7rem)] lg:py-6">
        <div className="shrink-0 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#1a4fa3] md:text-3xl lg:text-4xl">
            Find The Best Flight Deals
          </h1>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-slate-600">
            Book your next adventure — search, review fares, pay securely, and get your e-ticket
            instantly.
          </p>
        </div>

        <div className="mt-5 grid flex-1 items-center gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8">
          <div className="order-2 lg:order-1">{formCard}</div>

          <div className="order-1 flex min-h-[200px] items-center justify-center lg:order-2 lg:min-h-0">
            <div className="relative flex h-full w-full max-h-[min(420px,50vh)] items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100/80 via-blue-50/50 to-transparent p-3 sm:max-h-[280px] lg:max-h-none lg:min-h-[340px]">
              <img
                src={FLIGHT_HERO_IMAGE}
                alt="Commercial airplane"
                className="max-h-full w-full max-w-full object-contain object-center drop-shadow-xl"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
