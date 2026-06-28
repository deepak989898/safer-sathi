"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { enGB } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

function isoToLocalDate(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function localDateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Local today as yyyy-mm-dd (for min travel dates). */
export function todayIsoDate(): string {
  return localDateToIso(new Date());
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
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState(() => formatIsoDateForDisplay(value));
  const suppressOpenRef = useRef(false);

  const closeCalendar = useCallback(() => {
    suppressOpenRef.current = true;
    setOpen(false);
    window.setTimeout(() => {
      suppressOpenRef.current = false;
    }, 200);
  }, []);

  const openCalendar = useCallback(() => {
    if (suppressOpenRef.current) return;
    setOpen(true);
  }, []);

  useEffect(() => {
    setDisplay(formatIsoDateForDisplay(value));
  }, [value]);

  const selectedDate = useMemo(() => isoToLocalDate(value), [value]);
  const minIso = min ?? todayIsoDate();
  const minDate = useMemo(() => isoToLocalDate(minIso), [minIso]);

  const commitDisplay = (nextDisplay: string) => {
    setDisplay(nextDisplay);
    if (!nextDisplay.trim()) {
      onChange("");
      return;
    }
    const iso = parseDisplayDateToIso(nextDisplay);
    if (!iso) return;
    if (iso < minIso) return;
    onChange(iso);
  };

  const handleCalendarSelect = (date?: Date) => {
    if (!date) {
      closeCalendar();
      return;
    }
    const iso = localDateToIso(date);
    if (iso < minIso) return;
    onChange(iso);
    setDisplay(formatIsoDateForDisplay(iso));
    closeCalendar();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && suppressOpenRef.current) return;
        setOpen(nextOpen);
      }}
    >
      <div className={cn("relative", className)}>
        <Input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={display}
          onChange={(event) => setDisplay(event.target.value)}
          onBlur={() => commitDisplay(display)}
          onClick={openCalendar}
          onFocus={openCalendar}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitDisplay(display);
              closeCalendar();
            }
            if (event.key === "ArrowDown" || event.key === " ") {
              event.preventDefault();
              openCalendar();
            }
          }}
          className="cursor-pointer pr-10"
          aria-label={placeholder}
        />
        <PopoverTrigger
          aria-label="Open calendar"
          render={
            <button
              type="button"
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            />
          }
        >
          <CalendarIcon className="h-4 w-4" />
        </PopoverTrigger>
      </div>

      <PopoverContent
        className="z-[120] w-auto p-0"
        align="start"
        sideOffset={6}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Calendar
          mode="single"
          locale={enGB}
          captionLayout="dropdown"
          selected={selectedDate}
          onSelect={handleCalendarSelect}
          defaultMonth={selectedDate ?? minDate}
          disabled={minDate ? { before: minDate } : undefined}
          startMonth={minDate}
          endMonth={new Date(new Date().getFullYear() + 3, 11, 31)}
        />
      </PopoverContent>
    </Popover>
  );
}
