"use client";

import type { SeatSellerSeat } from "@/lib/seatseller/types";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/i18n";
import { useAppStore } from "@/store/app-store";

interface BusSeatLayoutProps {
  seats: SeatSellerSeat[];
  selected: SeatSellerSeat[];
  maxSeats: number;
  onToggle: (seat: SeatSellerSeat) => void;
  passengerGenders?: Array<"MALE" | "FEMALE" | null>;
}

function seatStatus(
  seat: SeatSellerSeat,
  selected: SeatSellerSeat[]
): "booked" | "ladies" | "male" | "selected" | "available" {
  if (!seat.available) return "booked";
  if (selected.some((s) => s.name === seat.name)) return "selected";
  if (seat.ladiesSeat) return "ladies";
  if (seat.malesSeat) return "male";
  return "available";
}

export function BusSeatLayout({
  seats,
  selected,
  maxSeats,
  onToggle,
}: BusSeatLayoutProps) {
  const { locale } = useAppStore();
  const maxRow = Math.max(...seats.map((s) => s.row), 1);
  const maxCol = Math.max(...seats.map((s) => s.column), 1);
  const upper = seats.filter((s) => s.zIndex > 0);
  const lower = seats.filter((s) => s.zIndex === 0);
  const isSleeper = upper.length > 0;

  const renderDeck = (deckSeats: SeatSellerSeat[], label: string) => (
    <div className="space-y-3">
      <p className="text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div
        className="mx-auto grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${maxCol}, minmax(0, 1fr))`,
          maxWidth: isSleeper ? 280 : 320,
        }}
      >
        {Array.from({ length: maxRow }, (_, rowIdx) =>
          Array.from({ length: maxCol }, (_, colIdx) => {
            const seat = deckSeats.find(
              (s) => s.row === rowIdx + 1 && s.column === colIdx + 1
            );
            if (!seat) {
              return <div key={`empty-${rowIdx}-${colIdx}`} className="h-10" />;
            }
            const status = seatStatus(seat, selected);
            const disabled =
              status === "booked" ||
              (selected.length >= maxSeats && status !== "selected");

            return (
              <button
                key={seat.name}
                type="button"
                disabled={disabled}
                onClick={() => onToggle(seat)}
                title={
                  seat.fare
                    ? `${seat.name} — ${formatCurrency(seat.fare, locale)}`
                    : seat.name
                }
                className={cn(
                  "flex items-center justify-center rounded-md border text-[10px] font-semibold transition-colors",
                  isSleeper ? "h-14" : "h-10",
                  status === "booked" && "cursor-not-allowed bg-muted text-muted-foreground",
                  status === "available" && "border-border bg-background hover:border-primary",
                  status === "selected" && "border-primary bg-primary text-primary-foreground",
                  status === "ladies" &&
                    "border-pink-300 bg-pink-50 text-pink-800 hover:border-pink-500",
                  status === "male" &&
                    "border-blue-300 bg-blue-50 text-blue-800 hover:border-blue-500"
                )}
              >
                {seat.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded border bg-background" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded border border-primary bg-primary" /> Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded bg-muted" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded border-pink-300 bg-pink-50" /> Ladies
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-4 rounded border-blue-300 bg-blue-50" /> Male
        </span>
      </div>

      {isSleeper ? (
        <div className="grid gap-8 md:grid-cols-2">
          {renderDeck(lower, "Lower deck")}
          {renderDeck(upper, "Upper deck")}
        </div>
      ) : (
        renderDeck(seats, "Select your seat")
      )}

      {selected.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p className="font-medium">Selected: {selected.map((s) => s.name).join(", ")}</p>
          <p className="text-muted-foreground">
            Total:{" "}
            {formatCurrency(
              selected.reduce((sum, s) => sum + (s.fare ?? 0), 0),
              locale
            )}
          </p>
        </div>
      )}
    </div>
  );
}
