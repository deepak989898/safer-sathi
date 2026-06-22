"use client";

import { Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { addDaysToIso, formatDisplayDate } from "@/lib/ai/travel-manager/parse-user-input";

interface AiChatDatePickerProps {
  mode: "check_in" | "check_out";
  locale: "en" | "hi";
  checkInDate?: string;
  onSelect: (isoDate: string) => void;
  disabled?: boolean;
}

export function AiChatDatePicker({
  mode,
  locale,
  checkInDate,
  onSelect,
  disabled,
}: AiChatDatePickerProps) {
  const today = new Date().toISOString().slice(0, 10);
  const minDate =
    mode === "check_out" && checkInDate ? addDaysToIso(checkInDate, 1) : today;

  const title =
    mode === "check_in"
      ? locale === "hi"
        ? "चेक-इन तारीख चुनें"
        : "Select check-in date"
      : locale === "hi"
        ? "चेक-आउट तारीख चुनें"
        : "Select check-out date";

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
        <Calendar className="h-4 w-4 shrink-0" />
        {title}
      </div>
      {mode === "check_out" && checkInDate && (
        <p className="mb-2 text-xs text-muted-foreground">
          {locale === "hi" ? "चेक-इन:" : "Check-in:"}{" "}
          {formatDisplayDate(checkInDate, locale)}
        </p>
      )}
      <Input
        type="date"
        min={minDate}
        disabled={disabled}
        className="h-10 bg-background"
        onChange={(e) => {
          const value = e.target.value;
          if (value) onSelect(value);
        }}
      />
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {locale === "hi"
          ? "या नीचे चिप्स / टाइप से भी बता सकते हैं"
          : "Or tap chips below / type your answer"}
      </p>
    </div>
  );
}
