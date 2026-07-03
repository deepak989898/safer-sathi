"use client";

import { ArrowLeftRight, Headphones, Loader2, Plane, Shield, Tag } from "lucide-react";
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
import { CABIN_CLASSES, FARE_TYPES } from "@/lib/tripjack/config";
import type { FlightSearchParams } from "@/lib/tripjack/types";
import { HERO_IMAGES, heroBackgroundStyle } from "@/lib/media/travel-images";

const FEATURES = [
  { icon: Plane, label: "Best Airlines", sub: "Compare top carriers" },
  { icon: Tag, label: "Lowest Fares", sub: "Real-time pricing" },
  { icon: Shield, label: "Secure", sub: "Proxy-protected API" },
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
  return (
    <div className="min-h-screen bg-slate-50">
      <section
        className="relative overflow-hidden pb-28 pt-14 text-white md:pb-36 md:pt-20"
        style={heroBackgroundStyle(HERO_IMAGES.airport)}
      >
        <div className="absolute inset-0 bg-[#1a4fa3]/85" />
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Book Flight Tickets</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-blue-100 md:text-base">
            Search one-way flights across India — powered by TripJack
          </p>
        </div>
      </section>

      <section className="container relative z-10 mx-auto -mt-24 px-4 pb-10 md:-mt-28">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl md:p-8">
          <p className="mb-4 text-sm font-semibold text-slate-500">ONE WAY</p>

          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                From (IATA)
              </Label>
              <Input
                className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 text-base uppercase"
                placeholder="DEL"
                maxLength={3}
                value={params.fromCode}
                onChange={(e) => onChange({ fromCode: e.target.value.toUpperCase().slice(0, 3) })}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mx-auto mt-6 h-10 w-10 shrink-0 rounded-full border-slate-200"
              onClick={onSwap}
              aria-label="Swap airports"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                To (IATA)
              </Label>
              <Input
                className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 text-base uppercase"
                placeholder="BOM"
                maxLength={3}
                value={params.toCode}
                onChange={(e) => onChange({ toCode: e.target.value.toUpperCase().slice(0, 3) })}
              />
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
                onChange={(e) => onChange({ adults: Math.max(1, Number(e.target.value) || 1) })}
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
                onChange={(e) => onChange({ children: Math.max(0, Number(e.target.value) || 0) })}
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
                onChange={(e) => onChange({ infants: Math.max(0, Number(e.target.value) || 0) })}
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
                onValueChange={(v) => onChange({ cabinClass: v as FlightSearchParams["cabinClass"] })}
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
                Fare type (pft)
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

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={params.isDirectFlight}
                onChange={(e) => onChange({ isDirectFlight: e.target.checked })}
              />
              Direct flights
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={params.isConnectingFlight}
                onChange={(e) => onChange({ isConnectingFlight: e.target.checked })}
              />
              Connecting flights
            </label>
          </div>

          <Button
            className="mt-6 h-12 w-full rounded-xl bg-[#1a4fa3] text-base font-semibold hover:bg-[#16408a]"
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
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-[#1a4fa3]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{label}</p>
                <p className="text-xs text-slate-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
