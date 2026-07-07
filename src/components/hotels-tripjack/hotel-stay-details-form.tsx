"use client";

import { useState } from "react";
import { Calendar, Loader2, Plus, Trash2, Users } from "lucide-react";
import {
  HotelCard,
  HotelFieldLabel,
  HotelPrimaryButton,
} from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { MAX_HOTEL_ROOMS } from "@/lib/tripjack-hotels/catalog-types";
import type { HotelRoomRequest } from "@/lib/tripjack-hotels/types";
import { toast } from "sonner";

function defaultStayDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 14);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}

export interface HotelStayDetails {
  checkIn: string;
  checkOut: string;
  rooms: HotelRoomRequest[];
}

export function HotelStayDetailsForm({
  hotelName,
  loading,
  onSubmit,
}: {
  hotelName?: string;
  loading?: boolean;
  onSubmit: (details: HotelStayDetails) => void;
}) {
  const dates = defaultStayDates();
  const today = new Date().toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState(dates.checkIn);
  const [checkOut, setCheckOut] = useState(dates.checkOut);
  const [rooms, setRooms] = useState<HotelRoomRequest[]>([{ adults: 2 }]);

  const totalGuests = rooms.reduce((sum, r) => sum + (r.adults ?? 1) + (r.children ?? 0), 0);

  const onRoomChange = (index: number, patch: Partial<HotelRoomRequest>) => {
    setRooms((prev) => prev.map((room, i) => (i === index ? { ...room, ...patch } : room)));
  };

  const handleSubmit = () => {
    if (!checkIn || !checkOut) {
      toast.error("Select check-in and check-out dates");
      return;
    }
    if (checkIn < today) {
      toast.error("Check-in must be today or a future date");
      return;
    }
    if (checkOut <= checkIn) {
      toast.error("Check-out must be after check-in");
      return;
    }
    for (const room of rooms) {
      if ((room.adults ?? 0) < 1) {
        toast.error("Each room needs at least 1 adult");
        return;
      }
      const children = room.children ?? 0;
      if (children > 0 && (!room.childAge || room.childAge.length < children)) {
        toast.error("Enter age for each child");
        return;
      }
    }
    onSubmit({ checkIn, checkOut, rooms });
  };

  return (
    <HotelCard className="mb-6">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-[#0c2444]">Select stay details</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {hotelName
            ? `Choose dates and guests for ${hotelName}. Live room rates load after you continue.`
            : "Choose dates and guests to view live room rates and book."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <HotelFieldLabel>Check-in</HotelFieldLabel>
          <div className="relative mt-1.5">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              className="h-11 w-full rounded border bg-white pl-10 pr-3 text-sm"
              style={{ borderColor: HOTEL_UI.border }}
              value={checkIn}
              min={today}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </div>
        </div>
        <div>
          <HotelFieldLabel>Check-out</HotelFieldLabel>
          <div className="relative mt-1.5">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              className="h-11 w-full rounded border bg-white pl-10 pr-3 text-sm"
              style={{ borderColor: HOTEL_UI.border }}
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: HOTEL_UI.primary }} />
            <HotelFieldLabel>Rooms &amp; guests</HotelFieldLabel>
            <span className="text-sm font-medium" style={{ color: HOTEL_UI.text }}>
              {rooms.length} room{rooms.length > 1 ? "s" : ""}, {totalGuests} guest
              {totalGuests > 1 ? "s" : ""}
            </span>
          </div>
          <button
            type="button"
            className="text-sm font-semibold hover:underline"
            style={{ color: HOTEL_UI.action }}
            onClick={() => {
              if (rooms.length >= MAX_HOTEL_ROOMS) {
                toast.error(`Maximum ${MAX_HOTEL_ROOMS} rooms allowed`);
                return;
              }
              setRooms((prev) => [...prev, { adults: 1 }]);
            }}
            disabled={rooms.length >= MAX_HOTEL_ROOMS}
          >
            <Plus className="mr-1 inline h-4 w-4" />
            Add room
          </button>
        </div>

        <div className="space-y-3">
          {rooms.map((room, roomIndex) => (
            <div
              key={roomIndex}
              className="rounded border bg-[#FAFBFC] p-4"
              style={{ borderColor: HOTEL_UI.border }}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: HOTEL_UI.primary }}>
                  Room {roomIndex + 1}
                </span>
                {rooms.length > 1 && (
                  <button type="button" onClick={() => setRooms((prev) => prev.filter((_, i) => i !== roomIndex))}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <HotelFieldLabel>Adults</HotelFieldLabel>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    className="mt-1 h-10 w-full rounded border bg-white px-3 text-sm"
                    style={{ borderColor: HOTEL_UI.border }}
                    value={room.adults}
                    onChange={(e) =>
                      onRoomChange(roomIndex, { adults: Math.max(1, Number(e.target.value) || 1) })
                    }
                  />
                </div>
                <div>
                  <HotelFieldLabel>Children</HotelFieldLabel>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    className="mt-1 h-10 w-full rounded border bg-white px-3 text-sm"
                    style={{ borderColor: HOTEL_UI.border }}
                    value={room.children ?? 0}
                    onChange={(e) => {
                      const nextChildren = Math.max(0, Math.min(6, Number(e.target.value) || 0));
                      const ages = [...(room.childAge ?? [])];
                      while (ages.length < nextChildren) ages.push(5);
                      onRoomChange(roomIndex, {
                        children: nextChildren,
                        childAge: ages.slice(0, nextChildren),
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <HotelPrimaryButton loading={loading} onClick={handleSubmit}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading live rates…
            </>
          ) : (
            "View live rooms & rates"
          )}
        </HotelPrimaryButton>
      </div>
    </HotelCard>
  );
}
