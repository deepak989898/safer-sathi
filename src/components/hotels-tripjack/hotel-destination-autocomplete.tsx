"use client";

import { useRef } from "react";
import { MapPin, Building2, Globe2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DestinationSuggestion } from "@/lib/tripjack-hotels/catalog-types";
import { cn } from "@/lib/utils";

interface HotelDestinationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: DestinationSuggestion) => void;
  suggestions: DestinationSuggestion[];
  loading: boolean;
  showDropdown: boolean;
  onFocus: () => void;
  onBlur: () => void;
  error?: string | null;
  hideLabel?: boolean;
  inputClassName?: string;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  highlightedIndex?: number;
  onHighlightedIndexChange?: (index: number) => void;
}

function suggestionIcon(type: DestinationSuggestion["type"]) {
  if (type === "hotel") return Building2;
  if (type === "country") return Globe2;
  return MapPin;
}

export function HotelDestinationAutocomplete({
  value,
  onChange,
  onSelect,
  suggestions,
  loading,
  showDropdown,
  onFocus,
  onBlur,
  error,
  hideLabel,
  inputClassName,
  containerRef,
  highlightedIndex = -1,
  onHighlightedIndexChange,
}: HotelDestinationAutocompleteProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const rootRef = containerRef ?? internalRef;

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || !suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = Math.min(highlightedIndex + 1, suggestions.length - 1);
      onHighlightedIndexChange?.(next);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = Math.max(highlightedIndex - 1, 0);
      onHighlightedIndexChange?.(next);
    } else if (event.key === "Enter" && highlightedIndex >= 0) {
      event.preventDefault();
      const item = suggestions[highlightedIndex];
      if (item) onSelect(item);
    } else if (event.key === "Escape") {
      onHighlightedIndexChange?.(-1);
    }
  };

  return (
    <div ref={rootRef} className="relative sm:col-span-2">
      {!hideLabel && (
        <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Destination / City / Hotel Name
        </Label>
      )}
      <Input
        className={cn("mt-2 h-12 rounded border bg-white", inputClassName, hideLabel && "mt-0")}
        placeholder="Search Goa, Delhi, Mumbai, hotel name..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {showDropdown && (suggestions.length > 0 || loading || value.trim().length >= 2) && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border bg-white shadow-lg">
          {loading && (
            <div className="px-4 py-3 text-sm text-slate-500">Searching destinations...</div>
          )}
          {!loading && suggestions.length === 0 && value.trim().length >= 2 && (
            <div className="px-4 py-3 text-sm text-slate-500">
              No matches yet. Try Goa, Delhi, or Mumbai.
            </div>
          )}
          {!loading &&
            suggestions.map((item, index) => {
              const Icon = suggestionIcon(item.type);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-blue-50",
                    highlightedIndex === index && "bg-blue-50"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => onHighlightedIndexChange?.(index)}
                  onClick={() => onSelect(item)}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#006CE4]" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {item.label}
                      {item.type !== "hotel" && item.hotelCount > 0
                        ? ` — ${item.hotelCount} hotel${item.hotelCount === 1 ? "" : "s"}`
                        : ""}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{item.subtitle}</span>
                  </span>
                </button>
              );
            })}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
