"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  DepartureTimeSlot,
  FlightFilterMeta,
  FlightFilters,
  FlightSortOption,
  FlightStopsFilter,
} from "@/lib/flights/filters";
import { DEFAULT_FLIGHT_FILTERS } from "@/lib/flights/filters";
import { formatCurrency } from "@/lib/i18n";
import type { Locale } from "@/types";

const DEPARTURE_SLOTS: { id: DepartureTimeSlot; label: string; hint: string }[] = [
  { id: "morning", label: "Morning", hint: "5 AM – 12 PM" },
  { id: "afternoon", label: "Afternoon", hint: "12 PM – 5 PM" },
  { id: "evening", label: "Evening", hint: "5 PM – 10 PM" },
  { id: "night", label: "Night", hint: "10 PM – 5 AM" },
];

interface FlightFiltersSidebarProps {
  filters: FlightFilters;
  meta: FlightFilterMeta;
  locale: Locale;
  activeCount: number;
  onChange: (patch: Partial<FlightFilters>) => void;
  onReset: () => void;
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {children}
    </div>
  );
}

export function FlightFiltersSidebar({
  filters,
  meta,
  locale,
  activeCount,
  onChange,
  onReset,
}: FlightFiltersSidebarProps) {
  const toggleAirline = (code: string) => {
    const next = filters.airlines.includes(code)
      ? filters.airlines.filter((c) => c !== code)
      : [...filters.airlines, code];
    onChange({ airlines: next });
  };

  const toggleFareType = (id: string) => {
    const next = filters.fareTypes.includes(id)
      ? filters.fareTypes.filter((f) => f !== id)
      : [...filters.fareTypes, id];
    onChange({ fareTypes: next });
  };

  const toggleDepartureSlot = (slot: DepartureTimeSlot) => {
    const next = filters.departureSlots.includes(slot)
      ? filters.departureSlots.filter((s) => s !== slot)
      : [...filters.departureSlots, slot];
    onChange({ departureSlots: next });
  };

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="space-y-5 pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#1a4fa3]" />
            <p className="font-semibold text-slate-900">Filters</p>
            {activeCount > 0 && (
              <span className="rounded-full bg-[#1a4fa3] px-2 py-0.5 text-[10px] font-medium text-white">
                {activeCount}
              </span>
            )}
          </div>
          {activeCount > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={onReset}>
              <X className="mr-1 h-3 w-3" />
              Clear
            </Button>
          )}
        </div>

        <FilterSection title="Sort by">
          <Select
            value={filters.sortBy}
            onValueChange={(v) => onChange({ sortBy: v as FlightSortOption })}
          >
            <SelectTrigger className="h-10 rounded-xl border-slate-200 bg-slate-50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="departure_asc">Departure: Early First</SelectItem>
              <SelectItem value="departure_desc">Departure: Late First</SelectItem>
              <SelectItem value="duration_asc">Duration: Shortest</SelectItem>
            </SelectContent>
          </Select>
        </FilterSection>

        <FilterSection title="Stops">
          <div className="space-y-2">
            {(
              [
                { value: "all", label: "All flights" },
                { value: "nonstop", label: "Non-stop only" },
                { value: "1stop", label: "1 Stop" },
                { value: "2plus", label: "2+ Stops" },
              ] as const
            ).map(({ value, label }) => (
              <label key={value} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="stops"
                  className="border-slate-300"
                  checked={filters.stops === value}
                  onChange={() => onChange({ stops: value as FlightStopsFilter })}
                />
                {label}
              </label>
            ))}
          </div>
        </FilterSection>

        {meta.priceMax > meta.priceMin && (
          <FilterSection title="Price range">
            <div className="space-y-3">
              <input
                type="range"
                min={meta.priceMin}
                max={meta.priceMax}
                step={100}
                value={filters.maxPrice || meta.priceMax}
                onChange={(e) => onChange({ maxPrice: Number(e.target.value) })}
                className="w-full accent-[#1a4fa3]"
              />
              <div className="flex justify-between text-xs text-slate-600">
                <span>{formatCurrency(filters.minPrice || meta.priceMin, locale)}</span>
                <span>{formatCurrency(filters.maxPrice || meta.priceMax, locale)}</span>
              </div>
            </div>
          </FilterSection>
        )}

        <FilterSection title="Departure time">
          <div className="grid grid-cols-2 gap-2">
            {DEPARTURE_SLOTS.map(({ id, label, hint }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleDepartureSlot(id)}
                className={`rounded-xl border px-2 py-2 text-left text-xs transition-colors ${
                  filters.departureSlots.includes(id)
                    ? "border-[#1a4fa3] bg-blue-50 text-[#1a4fa3]"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <p className="font-medium">{label}</p>
                <p className="text-[10px] opacity-70">{hint}</p>
              </button>
            ))}
          </div>
        </FilterSection>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={filters.refundableOnly}
            onChange={(e) => onChange({ refundableOnly: e.target.checked })}
          />
          Refundable fares only
        </label>

        {meta.airlines.length > 0 && (
          <FilterSection title="Airlines">
            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {meta.airlines.map(({ code, name, count }) => (
                <label key={code} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={filters.airlines.includes(code)}
                      onChange={() => toggleAirline(code)}
                    />
                    <span className="truncate">{name}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">({count})</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {meta.fareTypes.length > 1 && (
          <FilterSection title="Fare type">
            <div className="space-y-2">
              {meta.fareTypes.map(({ id, count }) => (
                <label key={id} className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={filters.fareTypes.includes(id)}
                      onChange={() => toggleFareType(id)}
                    />
                    {id.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-slate-400">({count})</span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}
      </CardContent>
    </Card>
  );
}

export function FlightFiltersMobileBar({
  activeCount,
  onOpen,
}: {
  activeCount: number;
  onOpen: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-xl border-slate-200 lg:hidden"
      onClick={onOpen}
    >
      <SlidersHorizontal className="mr-2 h-4 w-4" />
      Filters
      {activeCount > 0 && (
        <span className="ml-2 rounded-full bg-[#1a4fa3] px-2 py-0.5 text-[10px] text-white">
          {activeCount}
        </span>
      )}
    </Button>
  );
}

export { DEFAULT_FLIGHT_FILTERS };
