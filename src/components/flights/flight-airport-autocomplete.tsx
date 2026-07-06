"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  findAirportByIata,
  formatAirportLabel,
  searchFlightAirports,
  type FlightAirport,
} from "@/lib/flights/airports";
import { cn } from "@/lib/utils";

interface FlightAirportAutocompleteProps {
  id: string;
  label: string;
  value: string;
  query: string;
  error?: string | null;
  placeholder?: string;
  onQueryChange: (query: string) => void;
  onSelect: (airport: FlightAirport) => void;
  onCodeChange: (code: string) => void;
}

export function FlightAirportAutocomplete({
  id,
  label,
  value,
  query,
  error,
  placeholder = "City or airport",
  onQueryChange,
  onSelect,
  onCodeChange,
}: FlightAirportAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => searchFlightAirports(query, 8), [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, suggestions.length]);

  const handleSelect = (airport: FlightAirport) => {
    onSelect(airport);
    onCodeChange(airport.iata);
    onQueryChange(formatAirportLabel(airport));
    setOpen(false);
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      setOpen(false);
      const airport = findAirportByIata(value);
      if (airport) {
        onQueryChange(formatAirportLabel(airport));
        return;
      }
      if (value.length === 3) {
        const byCode = findAirportByIata(value);
        if (byCode) {
          onQueryChange(formatAirportLabel(byCode));
        }
      }
    }, 150);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && suggestions[activeIndex]) {
      event.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </Label>
      <Input
        id={id}
        className={cn(
          "mt-1 h-11 rounded-xl border-slate-200 bg-slate-50 text-base font-semibold text-slate-900",
          error && "border-red-300 focus-visible:ring-red-200"
        )}
        placeholder={placeholder}
        value={query}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        onChange={(event) => {
          const next = event.target.value;
          onQueryChange(next);
          onCodeChange("");
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />

      {open && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              No airports found. Try Delhi, Mumbai, or Lucknow.
            </div>
          ) : (
            suggestions.map((airport, index) => (
              <button
                key={airport.iata}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={cn(
                  "flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-blue-50",
                  index === activeIndex && "bg-blue-50"
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(airport)}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1a4fa3]" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">
                    {airport.city}{" "}
                    <span className="font-mono text-[#1a4fa3]">({airport.iata})</span>
                  </span>
                  <span className="block truncate text-xs text-slate-500">{airport.airport}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
