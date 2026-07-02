"use client";

import {
  ArrowLeftRight,
  Bus,
  Headphones,
  Loader2,
  Shield,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBusCityLabel } from "@/lib/bus/cities-search";
import type { BusCityRecord } from "@/lib/seatseller/types";
import type { BusSearchParams } from "@/lib/bus/session";
import { HERO_IMAGES, heroBackgroundStyle } from "@/lib/media/travel-images";

const FEATURES = [
  { icon: Bus, label: "Easy Booking", sub: "Book in minutes" },
  { icon: Tag, label: "Best Prices", sub: "Compare & save" },
  { icon: Shield, label: "Secure Payment", sub: "100% safe checkout" },
  { icon: Headphones, label: "24/7 Support", sub: "We're here to help" },
] as const;

interface BusSearchScreenProps {
  search: BusSearchParams;
  fromQuery: string;
  toQuery: string;
  fromCities: BusCityRecord[];
  toCities: BusCityRecord[];
  showFromDropdown: boolean;
  showToDropdown: boolean;
  fromError: string | null;
  toError: string | null;
  loading: boolean;
  onFromQueryChange: (value: string) => void;
  onToQueryChange: (value: string) => void;
  onFromFocus: () => void;
  onToFocus: () => void;
  onFromBlur: () => void;
  onToBlur: () => void;
  onSelectFrom: (city: BusCityRecord) => void;
  onSelectTo: (city: BusCityRecord) => void;
  onSwap: () => void;
  onDateChange: (value: string) => void;
  onSearch: () => void;
}

export function BusSearchScreen({
  search,
  fromQuery,
  toQuery,
  fromCities,
  toCities,
  showFromDropdown,
  showToDropdown,
  fromError,
  toError,
  loading,
  onFromQueryChange,
  onToQueryChange,
  onFromFocus,
  onToFocus,
  onFromBlur,
  onToBlur,
  onSelectFrom,
  onSelectTo,
  onSwap,
  onDateChange,
  onSearch,
}: BusSearchScreenProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <section
        className="relative overflow-hidden pb-28 pt-14 text-white md:pb-36 md:pt-20"
        style={heroBackgroundStyle(HERO_IMAGES.bus)}
      >
        <div className="absolute inset-0 bg-[#1a4fa3]/85" />
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">Book Bus Tickets</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-blue-100 md:text-base">
            Travel anywhere with comfort and safety
          </p>
        </div>
      </section>

      <section className="container relative z-10 mx-auto -mt-24 px-4 pb-10 md:-mt-28">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl md:p-8">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <div className="relative">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                From
              </Label>
              <Input
                className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 text-base"
                placeholder="Enter source city"
                value={fromQuery || search.sourceCityName}
                onChange={(e) => onFromQueryChange(e.target.value)}
                onFocus={onFromFocus}
                onBlur={onFromBlur}
              />
              {showFromDropdown && fromCities.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-xl border bg-white shadow-lg">
                  {fromCities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm hover:bg-blue-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSelectFrom(city)}
                    >
                      {formatBusCityLabel(city)}
                    </button>
                  ))}
                </div>
              )}
              {fromError && <p className="mt-1 text-xs text-red-600">{fromError}</p>}
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mx-auto h-11 w-11 shrink-0 rounded-full border-blue-200 text-[#1a4fa3]"
              onClick={onSwap}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>

            <div className="relative">
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                To
              </Label>
              <Input
                className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50 text-base"
                placeholder="Enter destination city"
                value={toQuery || search.destinationCityName}
                onChange={(e) => onToQueryChange(e.target.value)}
                onFocus={onToFocus}
                onBlur={onToBlur}
              />
              {showToDropdown && toCities.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-xl border bg-white shadow-lg">
                  {toCities.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      className="block w-full px-4 py-3 text-left text-sm hover:bg-blue-50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onSelectTo(city)}
                    >
                      {formatBusCityLabel(city)}
                    </button>
                  ))}
                </div>
              )}
              {toError && <p className="mt-1 text-xs text-red-600">{toError}</p>}
            </div>
          </div>

          <div className="mt-4">
            <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Journey Date
            </Label>
            <Input
              type="date"
              className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50"
              min={new Date().toISOString().slice(0, 10)}
              value={search.doj}
              onChange={(e) => onDateChange(e.target.value)}
            />
          </div>

          <Button
            className="mt-6 h-12 w-full rounded-xl bg-[#1a4fa3] text-base font-semibold hover:bg-[#163f85]"
            onClick={onSearch}
            disabled={
              loading || !search.sourceCityId || !search.destinationCityId || !search.doj
            }
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Search Buses
          </Button>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, label, sub }) => (
            <div
              key={label}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#1a4fa3]">
                <Icon className="h-6 w-6" />
              </div>
              <p className="mt-3 font-semibold text-slate-900">{label}</p>
              <p className="mt-1 text-sm text-slate-500">{sub}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
