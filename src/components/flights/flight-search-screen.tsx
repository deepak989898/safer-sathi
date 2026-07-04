"use client";

import {
  ArrowLeftRight,
  Headphones,
  Loader2,
  Plane,
  Shield,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { flightPrimaryButtonClass } from "@/components/flights/flight-ui";
import { CABIN_CLASSES, FARE_TYPES } from "@/lib/tripjack/config";
import type { FlightSearchParams } from "@/lib/tripjack/types";
import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: Plane, label: "Real-time Search", sub: "Live airline inventory" },
  { icon: Tag, label: "Best Fares", sub: "Transparent pricing" },
  { icon: Shield, label: "Secure Payments", sub: "Razorpay protected" },
  { icon: Headphones, label: "24/7 Support", sub: "We're here to help" },
] as const;

interface FlightSearchScreenProps {
  params: FlightSearchParams;
  loading: boolean;
  onChange: (patch: Partial<FlightSearchParams>) => void;
  onSwap: () => void;
  onSearch: () => void;
}

export function FlightSearchScreen({
  params,
  loading,
  onChange,
  onSwap,
  onSearch,
}: FlightSearchScreenProps) {
  const travelers = params.adults + params.children + params.infants;

  return (
    <div className="bg-[#f4f7fb]">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#e8f0fb] via-[#f0f5fc] to-white pb-24 pt-10 md:pb-32 md:pt-14">
        <div className="pointer-events-none absolute -right-16 top-8 h-56 w-56 rounded-full bg-[#1a4fa3]/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-sky-300/20 blur-2xl" />

        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#1a4fa3] shadow-sm ring-1 ring-blue-100">
              <Plane className="h-3.5 w-3.5" />
              Safar Sathi Flights
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
              Find The Best Flight Deals
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 md:text-base">
              Search one-way flights, review fares, pay securely, and get your e-ticket instantly.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-4xl rounded-3xl border border-white/80 bg-white p-5 shadow-xl shadow-blue-900/5 md:p-8">
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#1a4fa3] px-4 py-1.5 text-xs font-semibold text-white">
                One Way
              </span>
              <span className="cursor-not-allowed rounded-full bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-400">
                Round Trip
              </span>
              <span className="cursor-not-allowed rounded-full bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-400">
                Multi City
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  From
                </Label>
                <Input
                  className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 text-base font-semibold uppercase"
                  placeholder="DEL"
                  maxLength={3}
                  value={params.fromCode}
                  onChange={(e) =>
                    onChange({ fromCode: e.target.value.toUpperCase().slice(0, 3) })
                  }
                />
                <p className="mt-1 text-xs text-slate-400">IATA airport code</p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mx-auto mt-6 h-11 w-11 shrink-0 rounded-full border-blue-100 bg-blue-50 text-[#1a4fa3] hover:bg-blue-100"
                onClick={onSwap}
                aria-label="Swap airports"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>

              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  To
                </Label>
                <Input
                  className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 text-base font-semibold uppercase"
                  placeholder="BOM"
                  maxLength={3}
                  value={params.toCode}
                  onChange={(e) =>
                    onChange({ toCode: e.target.value.toUpperCase().slice(0, 3) })
                  }
                />
                <p className="mt-1 text-xs text-slate-400">IATA airport code</p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Departure
                </Label>
                <Input
                  type="date"
                  className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50"
                  value={params.departureDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => onChange({ departureDate: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Adults
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={9}
                  className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50"
                  value={params.adults}
                  onChange={(e) =>
                    onChange({ adults: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Children
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={9}
                  className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50"
                  value={params.children}
                  onChange={(e) =>
                    onChange({ children: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Infants
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={9}
                  className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50"
                  value={params.infants}
                  onChange={(e) =>
                    onChange({ infants: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cabin class
                </Label>
                <Select
                  value={params.cabinClass}
                  onValueChange={(v) =>
                    onChange({ cabinClass: v as FlightSearchParams["cabinClass"] })
                  }
                >
                  <SelectTrigger className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50">
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
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Fare type
                </Label>
                <Select
                  value={params.pft}
                  onValueChange={(v) => onChange({ pft: v as FlightSearchParams["pft"] })}
                >
                  <SelectTrigger className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FARE_TYPES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                <Users className="h-4 w-4 text-[#1a4fa3]" />
                {travelers} Traveler{travelers > 1 ? "s" : ""},{" "}
                {params.cabinClass.replace(/_/g, " ")}
              </span>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-[#1a4fa3]"
                  checked={params.isDirectFlight}
                  onChange={(e) => onChange({ isDirectFlight: e.target.checked })}
                />
                Direct
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-[#1a4fa3]"
                  checked={params.isConnectingFlight}
                  onChange={(e) => onChange({ isConnectingFlight: e.target.checked })}
                />
                Connecting
              </label>
            </div>

            <Button
              className={cn(flightPrimaryButtonClass(), "mt-6")}
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

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-white bg-white/90 p-4 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1a4fa3]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
