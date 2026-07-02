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
  locale,
  onToggleSeat,
  onBoardingChange,
  onDroppingChange,
  onContinue,
}: BusSeatScreenProps) {
  const totalFare = selectedSeats.reduce((sum, seat) => sum + (seat.fare ?? 0), 0);

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
    <div className="min-h-screen bg-slate-100 pb-28">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/bus/results"
            className="mb-2 inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to buses
          </Link>
          <h1 className="text-xl font-bold text-slate-900">{trip.travels ?? trip.operator}</h1>
          <p className="text-sm text-slate-500">{trip.busType}</p>
          <div className="mt-3 flex flex-wrap gap-4">
            {AMENITIES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 text-xs text-slate-600"
              >
                <Icon className="h-4 w-4 text-[#1a4fa3]" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto grid gap-6 px-4 py-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              <h2 className="mb-4 font-semibold text-slate-900">Select your seats</h2>
              {loading && (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1a4fa3]" />
                </div>
              )}
              {!loading && loadError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {loadError}
                  <div className="mt-3">
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
                <p className="py-10 text-center text-slate-500">
                  Seat layout is not available for this bus. Try another service.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit rounded-2xl border-slate-200 shadow-sm lg:sticky lg:top-24">
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">
                Boarding Point
              </Label>
              <Select
                value={boardingId || undefined}
                onValueChange={(v) => onBoardingChange(v ?? "")}
              >
                <SelectTrigger className="mt-2 h-11 rounded-xl">
                  <SelectValue placeholder="Select boarding point" />
                </SelectTrigger>
                <SelectContent>
                  {boardingPoints.map((point) => (
                    <SelectItem key={point.id} value={point.id}>
                      {point.time} — {point.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase text-slate-500">
                Dropping Point
              </Label>
              <Select
                value={droppingId || undefined}
                onValueChange={(v) => onDroppingChange(v ?? "")}
              >
                <SelectTrigger className="mt-2 h-11 rounded-xl">
                  <SelectValue placeholder="Select dropping point" />
                </SelectTrigger>
                <SelectContent>
                  {droppingPoints.map((point) => (
                    <SelectItem key={point.id} value={point.id}>
                      {point.time} — {point.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSeats.length > 0 && (
              <div className="rounded-xl bg-blue-50 p-3 text-sm">
                <p className="font-medium text-slate-900">
                  Selected: {selectedSeats.map((s) => s.name).join(", ")}
                </p>
                <p className="mt-1 text-[#1a4fa3]">
                  Total: {formatCurrency(totalFare, locale)}
                </p>
              </div>
            )}
            <Button
              className="h-11 w-full rounded-xl bg-[#1a4fa3] hover:bg-[#163f85]"
              disabled={selectedSeats.length === 0}
              onClick={onContinue}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>

      {selectedSeats.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white p-4 shadow-lg lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">{selectedSeats.length} seat(s)</p>
              <p className="font-bold text-[#1a4fa3]">{formatCurrency(totalFare, locale)}</p>
            </div>
            <Button
              className="rounded-xl bg-[#1a4fa3]"
              disabled={selectedSeats.length === 0}
              onClick={onContinue}
            >
              Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
