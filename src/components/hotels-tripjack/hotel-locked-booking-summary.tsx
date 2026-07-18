"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { HotelCancellationTimeline } from "@/components/hotels-tripjack/hotel-cancellation-timeline";
import { HotelCard, HotelFieldLabel, HotelPrimaryButton } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { MAX_HOTEL_ROOMS } from "@/lib/tripjack-hotels/catalog-types";
import type { HotelRoomRequest, NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";
import { toast } from "sonner";

export const HOTEL_BOOKING_STEPS = [
  "Search",
  "Select Room",
  "Guests",
  "Review",
  "Payment",
] as const;

export function countHotelNights(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

export function hotelGuestOccupancySummary(rooms: HotelRoomRequest[]): string {
  let adults = 0;
  let children = 0;
  for (const room of rooms) {
    adults += Number(room.adults) || 0;
    children += Number(room.children) || 0;
  }
  return `${rooms.length} room${rooms.length === 1 ? "" : "s"} · ${adults} adult${adults === 1 ? "" : "s"}${
    children > 0 ? ` · ${children} child${children === 1 ? "" : "ren"}` : ""
  }`;
}

interface HotelLockedBookingSummaryProps {
  review: NormalizedHotelReviewResult;
  locale: Locale;
  showCancellation?: boolean;
  /** Tighter layout for guests page */
  compact?: boolean;
  /** Allow editing rooms/adults (invalidates locked rate and reopens room selection) */
  onEditOccupancy?: (rooms: HotelRoomRequest[]) => void | Promise<void>;
  editLoading?: boolean;
}

/** Locked TripJack review summary shown on Guests + final Review pages. */
export function HotelLockedBookingSummary({
  review,
  locale,
  showCancellation = false,
  compact = false,
  onEditOccupancy,
  editLoading = false,
}: HotelLockedBookingSummaryProps) {
  const option = review.option;
  const nights = countHotelNights(review.searchContext.checkIn, review.searchContext.checkOut);
  const [editing, setEditing] = useState(false);
  const [rooms, setRooms] = useState<HotelRoomRequest[]>(() =>
    review.searchContext.rooms.map((room) => ({
      adults: room.adults ?? 1,
      children: room.children ?? 0,
      childAge: room.childAge ? [...room.childAge] : undefined,
    }))
  );

  const occupancyLabel = useMemo(() => hotelGuestOccupancySummary(rooms), [rooms]);

  const applyOccupancy = async () => {
    for (const room of rooms) {
      if ((room.adults ?? 0) < 1) {
        toast.error("Each room needs at least 1 adult");
        return;
      }
    }
    await onEditOccupancy?.(rooms);
  };

  const roomTitle = option.roomInfo[0] || option.roomName;

  return (
    <HotelCard padding={compact ? "sm" : "md"} className={compact ? "!p-3" : "!p-4"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p
                className={`font-bold uppercase tracking-wide ${compact ? "text-[10px]" : "text-xs"}`}
                style={{ color: HOTEL_UI.success }}
              >
                Review confirmed · Price locked
              </p>
              <h2
                className={`font-bold ${compact ? "mt-0.5 text-base" : "mt-1 text-xl"}`}
                style={{ color: HOTEL_UI.primary }}
              >
                {review.hotelName}
              </h2>
              <p
                className={`text-xs ${compact ? "mt-0.5" : "mt-1.5 text-sm"}`}
                style={{ color: HOTEL_UI.textMuted }}
              >
                Ref: <span className="font-mono">{review.bookingId}</span>
              </p>
            </div>
            {onEditOccupancy ? (
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-semibold sm:hidden"
                style={{ borderColor: HOTEL_UI.action, color: HOTEL_UI.action }}
                onClick={() => setEditing((open) => !open)}
              >
                <Pencil className="h-3.5 w-3.5" />
                {editing ? "Cancel" : "Edit"}
              </button>
            ) : null}
          </div>

          <div className={`flex flex-wrap gap-1.5 text-xs ${compact ? "mt-2" : "mt-2.5"}`}>
            <span className="rounded px-2 py-0.5" style={{ backgroundColor: "#F5F7FA" }}>
              {review.searchContext.checkIn} → {review.searchContext.checkOut}
            </span>
            <span className="rounded px-2 py-0.5" style={{ backgroundColor: "#F5F7FA" }}>
              {nights} night{nights === 1 ? "" : "s"}
            </span>
            <span className="rounded px-2 py-0.5" style={{ backgroundColor: "#F5F7FA" }}>
              {occupancyLabel}
            </span>
          </div>
        </div>

        <div
          className="shrink-0 border-t pt-2 sm:w-[240px] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"
          style={{ borderColor: HOTEL_UI.border }}
        >
          <div className="flex items-start justify-between gap-2 sm:block sm:text-right">
            <div className="min-w-0">
              <p
                className={`font-semibold leading-snug ${compact ? "text-sm" : "text-base"}`}
                style={{ color: HOTEL_UI.primary }}
              >
                {roomTitle}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: HOTEL_UI.textMuted }}>
                {option.mealBasisLabel} · {option.isRefundable ? "Refundable" : "Non-refundable"}
              </p>
            </div>
            {onEditOccupancy ? (
              <button
                type="button"
                className="mt-0 hidden shrink-0 items-center gap-1 rounded border px-2.5 py-1.5 text-xs font-semibold sm:mt-2 sm:inline-flex"
                style={{ borderColor: HOTEL_UI.action, color: HOTEL_UI.action }}
                onClick={() => setEditing((open) => !open)}
              >
                <Pencil className="h-3.5 w-3.5" />
                {editing ? "Cancel" : "Edit"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {editing && onEditOccupancy ? (
        <div className="mt-3 space-y-2 rounded border bg-[#FAFBFC] p-2.5" style={{ borderColor: HOTEL_UI.border }}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold" style={{ color: HOTEL_UI.primary }}>
              Edit rooms &amp; adults
            </p>
            <button
              type="button"
              className="text-xs font-semibold hover:underline"
              style={{ color: HOTEL_UI.action }}
              onClick={() => {
                if (rooms.length >= MAX_HOTEL_ROOMS) {
                  toast.error(`Maximum ${MAX_HOTEL_ROOMS} rooms allowed`);
                  return;
                }
                setRooms((prev) => [...prev, { adults: 1, children: 0 }]);
              }}
            >
              <Plus className="mr-0.5 inline h-3.5 w-3.5" />
              Add room
            </button>
          </div>

          {rooms.map((room, roomIndex) => (
            <div
              key={roomIndex}
              className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 rounded border bg-white p-2"
              style={{ borderColor: HOTEL_UI.border }}
            >
              <div>
                <HotelFieldLabel>Adults · Room {roomIndex + 1}</HotelFieldLabel>
                <input
                  type="number"
                  min={1}
                  max={8}
                  className="mt-1 h-8 w-full rounded border px-2 text-sm"
                  style={{ borderColor: HOTEL_UI.border }}
                  value={room.adults}
                  onChange={(e) =>
                    setRooms((prev) =>
                      prev.map((item, i) =>
                        i === roomIndex
                          ? { ...item, adults: Math.max(1, Number(e.target.value) || 1) }
                          : item
                      )
                    )
                  }
                />
              </div>
              <div>
                <HotelFieldLabel>Children</HotelFieldLabel>
                <input
                  type="number"
                  min={0}
                  max={6}
                  className="mt-1 h-8 w-full rounded border px-2 text-sm"
                  style={{ borderColor: HOTEL_UI.border }}
                  value={room.children ?? 0}
                  onChange={(e) => {
                    const nextChildren = Math.max(0, Math.min(6, Number(e.target.value) || 0));
                    setRooms((prev) =>
                      prev.map((item, i) => {
                        if (i !== roomIndex) return item;
                        const ages = [...(item.childAge ?? [])];
                        while (ages.length < nextChildren) ages.push(5);
                        return {
                          ...item,
                          children: nextChildren,
                          childAge: ages.slice(0, nextChildren),
                        };
                      })
                    );
                  }}
                />
              </div>
              {rooms.length > 1 ? (
                <button
                  type="button"
                  className="mb-1 rounded p-1.5 text-red-500 hover:bg-red-50"
                  onClick={() => setRooms((prev) => prev.filter((_, i) => i !== roomIndex))}
                  aria-label={`Remove room ${roomIndex + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : (
                <span className="w-8" />
              )}
            </div>
          ))}

          <p className="text-[10px]" style={{ color: HOTEL_UI.textMuted }}>
            Changing guests updates live rates. You’ll select a room again.
          </p>
          <HotelPrimaryButton
            className="!h-9 text-xs"
            loading={editLoading}
            onClick={() => void applyOccupancy()}
          >
            Update &amp; reselect room
          </HotelPrimaryButton>
        </div>
      ) : null}

      {showCancellation ? (
        <div className="mt-3 border-t pt-3" style={{ borderColor: HOTEL_UI.border }}>
          <HotelCancellationTimeline
            embedded
            isRefundable={option.isRefundable}
            freeCancellationUntil={option.freeCancellationUntil}
            penalties={option.penalties}
            locale={locale}
          />
        </div>
      ) : null}
    </HotelCard>
  );
}
