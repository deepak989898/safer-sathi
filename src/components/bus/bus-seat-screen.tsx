"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BatteryCharging,
  Loader2,
  Snowflake,
  Tv,
  Wifi,
} from "lucide-react";
import { BusSeatLayout } from "@/components/bus/bus-seat-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/i18n";
import type { Locale } from "@/types";
import type { SeatSellerSeat } from "@/lib/seatseller/types";
import type { BusSelectedTrip } from "@/lib/bus/session";

const AMENITIES = [
  { icon: Wifi, label: "Wi-Fi" },
  { icon: BatteryCharging, label: "Charging" },
  { icon: Snowflake, label: "AC" },
  { icon: Tv, label: "Entertainment" },
] as const;

function formatPointLabel(point: { location: string; time: string }): string {
  const time = point.time ? `${point.time} — ` : "";
  return `${time}${point.location}`;
}

interface BusSeatScreenProps {
  trip: BusSelectedTrip | null | undefined;
  seats: SeatSellerSeat[];
  selectedSeats: SeatSellerSeat[];
  maxSeats: number;
  loading: boolean;
  loadError: string | null;
  boardingId: string;
  droppingId: string;
  boardingPoints: Array<{ id: string; location: string; time: string }>;
  droppingPoints: Array<{ id: string; location: string; time: string }>;
  pointsLoading: boolean;
  locale: Locale;
  onToggleSeat: (seat: SeatSellerSeat) => void;
  onBoardingChange: (id: string) => void;
  onDroppingChange: (id: string) => void;
  onContinue: () => void;
}

export function BusSeatScreen({
  trip,
  seats,
  selectedSeats,
  maxSeats,
  loading,
  loadError,
  boardingId,
  droppingId,
  boardingPoints,
  droppingPoints,
  pointsLoading,
  locale,
  onToggleSeat,
  onBoardingChange,
  onDroppingChange,
  onContinue,
}: BusSeatScreenProps) {
  const totalFare = selectedSeats.reduce((sum, seat) => sum + (seat.fare ?? 0), 0);
  const canContinue =
    selectedSeats.length > 0 &&
    boardingPoints.length > 0 &&
    droppingPoints.length > 0 &&
    boardingId &&
    droppingId;

  const boardingOptions = boardingPoints.filter(
    (point, index, list) => point.id && list.findIndex((p) => p.id === point.id) === index
  );
  const droppingOptions = droppingPoints.filter(
    (point, index, list) => point.id && list.findIndex((p) => p.id === point.id) === index
  );
  const safeBoardingId = boardingOptions.some((p) => p.id === boardingId) ? boardingId : "";
  const safeDroppingId = droppingOptions.some((p) => p.id === droppingId) ? droppingId : "";

  if (!trip) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600">No bus selected. Please search again.</p>
        <Button className="bg-[#1a4fa3]" onClick={() => window.location.assign("/bus/results")}>
          Back to results
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-32">
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/bus/results"
            className="mb-3 inline-flex items-center text-sm font-medium text-slate-500 hover:text-[#1a4fa3]"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to buses
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900 md:text-2xl">
                {trip.travels ?? trip.operator}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">{trip.busType}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {AMENITIES.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                >
                  <Icon className="h-3.5 w-3.5 text-[#1a4fa3]" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            <h2 className="mb-1 text-lg font-bold text-slate-900">Select your seats</h2>
            <p className="mb-5 text-sm text-slate-500">
              Tap available seats to select. Max {maxSeats} seat(s) per ticket.
            </p>

            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-24">
                <Loader2 className="h-9 w-9 animate-spin text-[#1a4fa3]" />
                <p className="text-sm text-slate-500">Loading seat layout…</p>
              </div>
            )}

            {!loading && loadError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                {loadError}
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.assign("/bus/results")}
                  >
                    Choose another bus
                  </Button>
                </div>
              </div>
            )}

            {!loading && !loadError && seats.length > 0 && (
              <BusSeatLayout
                seats={seats}
                selected={selectedSeats}
                maxSeats={maxSeats}
                onToggle={onToggleSeat}
              />
            )}

            {!loading && !loadError && seats.length === 0 && (
              <p className="py-16 text-center text-slate-500">
                Seat layout is not available for this bus. Try another service.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit rounded-2xl border-slate-200 shadow-sm lg:sticky lg:top-24">
          <CardContent className="space-y-5 pt-6">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Boarding Point
              </Label>
              {boardingOptions.length > 0 ? (
                <Select
                  value={safeBoardingId || undefined}
                  onValueChange={(v) => onBoardingChange(v ?? "")}
                >
                  <SelectTrigger className="mt-2 h-11 rounded-xl border-slate-200">
                    <SelectValue placeholder="Select boarding point">
                      {safeBoardingId
                        ? formatPointLabel(
                            boardingOptions.find((p) => p.id === safeBoardingId) ?? {
                              location: "Boarding point",
                              time: "",
                            }
                          )
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {boardingOptions.map((point) => (
                      <SelectItem key={point.id} value={point.id}>
                        {formatPointLabel(point)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  {pointsLoading ? "Loading boarding points…" : "No boarding points available"}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Dropping Point
              </Label>
              {droppingOptions.length > 0 ? (
                <Select
                  value={safeDroppingId || undefined}
                  onValueChange={(v) => onDroppingChange(v ?? "")}
                >
                  <SelectTrigger className="mt-2 h-11 rounded-xl border-slate-200">
                    <SelectValue placeholder="Select dropping point">
                      {safeDroppingId
                        ? formatPointLabel(
                            droppingOptions.find((p) => p.id === safeDroppingId) ?? {
                              location: "Dropping point",
                              time: "",
                            }
                          )
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {droppingOptions.map((point) => (
                      <SelectItem key={point.id} value={point.id}>
                        {formatPointLabel(point)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-2 text-sm text-slate-500">
                  {pointsLoading ? "Loading dropping points…" : "No dropping points available"}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Your selection
              </p>
              <p className="mt-2 font-medium text-slate-900">
                {selectedSeats.length > 0
                  ? selectedSeats.map((s) => s.name).join(", ")
                  : "No seats selected yet"}
              </p>
              <p className="mt-1 text-lg font-bold text-[#1a4fa3]">
                {formatCurrency(totalFare, locale)}
              </p>
            </div>

            <Button
              className="hidden h-12 w-full rounded-xl bg-[#1a4fa3] text-base font-semibold hover:bg-[#163f85] lg:flex"
              disabled={!canContinue}
              onClick={onContinue}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Selected seats
            </p>
            <p className="truncate text-sm font-medium text-slate-900">
              {selectedSeats.length > 0
                ? selectedSeats.map((s) => s.name).join(", ")
                : "None"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total fare
            </p>
            <p className="text-lg font-bold text-[#1a4fa3]">
              {formatCurrency(totalFare, locale)}
            </p>
          </div>
          <Button
            className="h-11 shrink-0 rounded-xl bg-[#1a4fa3] px-8 font-semibold hover:bg-[#163f85]"
            disabled={!canContinue}
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
