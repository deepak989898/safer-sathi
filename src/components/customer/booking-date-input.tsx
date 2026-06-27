"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** ISO yyyy-mm-dd → dd/mm/yyyy */
export function formatIsoDateForDisplay(iso: string): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return "";
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

/** dd/mm/yyyy → ISO yyyy-mm-dd */
export function parseDisplayDateToIso(display: string): string | null {
  const trimmed = display.trim();
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000) return null;

  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00`);
  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return iso;
}

interface BookingDateInputProps {
  id?: string;
  value: string;
  onChange: (isoValue: string) => void;
  min?: string;
  className?: string;
  placeholder?: string;
}

export function BookingDateInput({
  id,
  value,
  onChange,
  min,
  className,
  placeholder = "DD/MM/YYYY",
}: BookingDateInputProps) {
  const [display, setDisplay] = useState(() => formatIsoDateForDisplay(value));

  useEffect(() => {
    setDisplay(formatIsoDateForDisplay(value));
  }, [value]);

  const commitDisplay = (nextDisplay: string) => {
    setDisplay(nextDisplay);
    if (!nextDisplay.trim()) {
      onChange("");
      return;
    }
    const iso = parseDisplayDateToIso(nextDisplay);
    if (!iso) return;
    if (min && iso < min) return;
    onChange(iso);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      value={display}
      onChange={(event) => setDisplay(event.target.value)}
      onBlur={() => commitDisplay(display)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commitDisplay(display);
        }
      }}
      className={cn(className)}
      aria-label={placeholder}
    />
  );
}
