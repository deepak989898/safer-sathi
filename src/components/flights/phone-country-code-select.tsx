"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  findPhoneCountryByDialCode,
  formatPhoneCountryLabel,
  searchPhoneCountries,
  type PhoneCountryCode,
} from "@/lib/phone-country-codes";
import { cn } from "@/lib/utils";

interface PhoneCountryCodeSelectProps {
  value: string;
  onChange: (dialCode: string) => void;
  className?: string;
}

export function PhoneCountryCodeSelect({
  value,
  onChange,
  className,
}: PhoneCountryCodeSelectProps) {
  const normalized = value.replace(/\D/g, "") || DEFAULT_PHONE_COUNTRY_CODE;
  const selected =
    findPhoneCountryByDialCode(normalized) ??
    findPhoneCountryByDialCode(DEFAULT_PHONE_COUNTRY_CODE)!;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => searchPhoneCountries(query, 15), [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, suggestions.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (country: PhoneCountryCode) => {
    onChange(country.dialCode);
    setQuery("");
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      handleSelect(suggestions[activeIndex]!);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative min-w-[7.5rem] shrink-0", className)}>
      <button
        type="button"
        className="flex h-11 w-full items-center justify-between gap-1 rounded-xl border border-input bg-slate-50 px-2.5 text-left text-sm hover:bg-slate-100"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate font-medium text-slate-900">+{selected.dialCode}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <Input
              autoFocus
              className="h-9 rounded-lg bg-slate-50 text-sm"
              placeholder="Search country or code"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
            {suggestions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">No matches</li>
            ) : (
              suggestions.map((country, index) => (
                <li key={`${country.code}-${country.dialCode}`}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={country.dialCode === normalized}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50",
                      index === activeIndex && "bg-blue-50",
                      country.dialCode === normalized && "font-semibold text-[#1a4fa3]"
                    )}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(country)}
                  >
                    <span className="w-12 shrink-0 font-mono text-slate-600">+{country.dialCode}</span>
                    <span className="truncate text-slate-800">{country.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <span className="sr-only">Selected: {formatPhoneCountryLabel(selected)}</span>
    </div>
  );
}
