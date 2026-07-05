"use client";

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
}: HotelDestinationAutocompleteProps) {
  return (
    <div className="relative sm:col-span-2">
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
        autoComplete="off"
      />
      {showDropdown && (suggestions.length > 0 || loading) && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border bg-white shadow-lg">
          {loading && (
            <div className="px-4 py-3 text-sm text-slate-500">Searching destinations...</div>
          )}
          {!loading &&
            suggestions.map((item) => {
              const Icon = suggestionIcon(item.type);
              return (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-blue-50"
                  onMouseDown={(e) => e.preventDefault()}
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

export function HotelAdminAdvancedPanel({
  open,
  onToggle,
  adminHidsInput,
  onAdminHidsChange,
  isSuperAdmin,
}: {
  open: boolean;
  onToggle: () => void;
  adminHidsInput: string;
  onAdminHidsChange: (value: string) => void;
  isSuperAdmin: boolean;
}) {
  if (!isSuperAdmin) return null;

  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <button
        type="button"
        className="text-sm font-semibold text-amber-900"
        onClick={onToggle}
      >
        {open ? "Hide" : "Show"} Advanced TripJack Test Options
      </button>
      {open && (
        <div className="mt-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Manual Hotel IDs (Super Admin only)
          </Label>
          <Input
            className={cn("mt-2 h-11 rounded-xl bg-white font-mono text-sm")}
            placeholder="1234,5464"
            value={adminHidsInput}
            onChange={(e) => onAdminHidsChange(e.target.value)}
          />
          <p className="mt-1 text-xs text-amber-800/80">
            Bypasses destination resolver. Hidden from customers.
          </p>
        </div>
      )}
    </div>
  );
}
