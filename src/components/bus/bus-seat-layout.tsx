"use client";

import type { ReactNode } from "react";
import { Bus } from "lucide-react";
import type { SeatSellerSeat } from "@/lib/seatseller/types";
import {
  buildDeckLayout,
  splitSeatsByDeck,
  type LayoutSeat,
} from "@/lib/bus/seat-layout-utils";
import { cn } from "@/lib/utils";

interface BusSeatLayoutProps {
  seats: SeatSellerSeat[];
  selected: SeatSellerSeat[];
  maxSeats: number;
  onToggle: (seat: SeatSellerSeat) => void;
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

function SeatButton({
  seat,
  selected,
  maxSeats,
  onToggle,
  tall,
}: {
  seat: LayoutSeat;
  selected: SeatSellerSeat[];
  maxSeats: number;
  onToggle: (seat: SeatSellerSeat) => void;
  tall: boolean;
}) {
  const status = seatStatus(seat, selected);
  const disabled =
    status === "booked" || (selected.length >= maxSeats && status !== "selected");

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(seat)}
      title={seat.fare ? `${seat.name} — ₹${seat.fare}` : seat.name}
      style={{
        gridRow: `span ${seat.rowSpan}`,
      }}
      className={cn(
        "flex w-11 items-center justify-center rounded-lg border-2 text-[11px] font-bold transition-all",
        tall ? "min-h-[52px]" : "h-10",
        status === "booked" &&
          "cursor-not-allowed border-rose-200 bg-rose-100 text-rose-400",
        status === "available" &&
          "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-[#1a4fa3] hover:shadow",
        status === "selected" &&
          "border-emerald-600 bg-emerald-500 text-white shadow-md ring-2 ring-emerald-200",
        status === "ladies" &&
          "border-pink-300 bg-pink-50 text-pink-800 hover:border-pink-500",
        status === "male" &&
          "border-sky-300 bg-sky-50 text-sky-800 hover:border-sky-500"
      )}
    >
      {seat.name}
    </button>
  );
}

function DeckSection({
  label,
  seats,
  selected,
  maxSeats,
  onToggle,
  tall,
}: {
  label: string;
  seats: SeatSellerSeat[];
  selected: SeatSellerSeat[];
  maxSeats: number;
  onToggle: (seat: SeatSellerSeat) => void;
  tall: boolean;
}) {
  const { seats: layoutSeats } = buildDeckLayout(seats);
  if (!layoutSeats.length) return null;

  const rowGroups = new Map<number, LayoutSeat[]>();
  for (const seat of layoutSeats) {
    const group = rowGroups.get(seat.gridRow) ?? [];
    group.push(seat);
    rowGroups.set(seat.gridRow, group);
  }

  const sortedRows = [...rowGroups.keys()].sort((a, b) => a - b);

  return (
    <div className="flex-1 min-w-0">
      <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-slate-500">
        {label}
      </p>
      <div className="mx-auto max-w-[220px] space-y-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        {sortedRows.map((rowNum) => {
          const rowSeats = [...(rowGroups.get(rowNum) ?? [])].sort(
            (a, b) => a.gridCol - b.gridCol
          );

          const nodes: ReactNode[] = [];
          for (let i = 0; i < rowSeats.length; i += 1) {
            const seat = rowSeats[i];
            const prev = rowSeats[i - 1];
            if (prev && seat.gridCol - prev.gridCol > 1) {
              nodes.push(
                <div
                  key={`aisle-${rowNum}-${i}`}
                  className="mx-1 w-5 shrink-0 border-l border-dashed border-slate-300"
                  aria-hidden
                />
              );
            }
            nodes.push(
              <SeatButton
                key={seat.name}
                seat={seat}
                selected={selected}
                maxSeats={maxSeats}
                onToggle={onToggle}
                tall={tall}
              />
            );
          }

          return (
            <div key={rowNum} className="flex items-center justify-center gap-1.5">
              {nodes}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BusSeatLayout({
  seats,
  selected,
  maxSeats,
  onToggle,
}: BusSeatLayoutProps) {
  if (!seats.length) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        No seats available to display.
      </p>
    );
  }

  const { lower, upper, isSleeper } = splitSeatsByDeck(seats);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <span className="flex items-center gap-2">
          <span className="h-5 w-8 rounded-md border-2 border-slate-200 bg-white" />
          Available
        </span>
        <span className="flex items-center gap-2">
          <span className="h-5 w-8 rounded-md border-2 border-emerald-600 bg-emerald-500" />
          Selected
        </span>
        <span className="flex items-center gap-2">
          <span className="h-5 w-8 rounded-md border-2 border-rose-200 bg-rose-100" />
          Booked
        </span>
        <span className="flex items-center gap-2">
          <span className="h-5 w-8 rounded-md border-2 border-pink-300 bg-pink-50" />
          Ladies
        </span>
        <span className="flex items-center gap-2">
          <span className="h-5 w-8 rounded-md border-2 border-sky-300 bg-sky-50" />
          Male
        </span>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex h-10 w-24 items-center justify-center rounded-t-2xl rounded-b-md border-2 border-slate-300 bg-slate-100">
          <Bus className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
          Front
        </p>
      </div>

      <div
        className={cn(
          "flex gap-6",
          isSleeper ? "flex-col md:flex-row md:items-start" : "justify-center"
        )}
      >
        <DeckSection
          label={isSleeper ? "Lower Deck" : "Select your seat"}
          seats={isSleeper ? lower : seats}
          selected={selected}
          maxSeats={maxSeats}
          onToggle={onToggle}
          tall={isSleeper}
        />
        {isSleeper && upper.length > 0 && (
          <DeckSection
            label="Upper Deck"
            seats={upper}
            selected={selected}
            maxSeats={maxSeats}
            onToggle={onToggle}
            tall
          />
        )}
      </div>
    </div>
  );
}
