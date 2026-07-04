"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HotelSearchScreen } from "@/components/hotels-tripjack/hotel-search-screen";
import { useAuth } from "@/contexts/auth-context";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { generateHotelCorrelationId } from "@/lib/tripjack-hotels/client";
import { saveHotelListingSession } from "@/lib/tripjack-hotels/session";
import type { HotelListingSearchParams, HotelRoomRequest } from "@/lib/tripjack-hotels/types";

function defaultDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 14);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);
  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}

function parseHids(input: string): number[] {
  return input
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function HotelSearchClient() {
  const router = useRouter();
  const { user } = useAuth();
  const isStaff = user ? canShowAdminNav(user.role) : false;
  const dates = useMemo(() => defaultDates(), []);

  const [hotelIdsInput, setHotelIdsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<HotelListingSearchParams>({
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    rooms: [{ adults: 2 }],
    currency: "INR",
    nationality: "106",
    hids: [],
    destinationLabel: "",
  });

  const onChange = useCallback((patch: Partial<HotelListingSearchParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  const onRoomChange = useCallback((index: number, patch: Partial<HotelRoomRequest>) => {
    setParams((prev) => ({
      ...prev,
      rooms: prev.rooms.map((room, i) => (i === index ? { ...room, ...patch } : room)),
    }));
  }, []);

  const onAddRoom = useCallback(() => {
    setParams((prev) => ({
      ...prev,
      rooms: [...prev.rooms, { adults: 1 }],
    }));
  }, []);

  const onRemoveRoom = useCallback((index: number) => {
    setParams((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((_, i) => i !== index),
    }));
  }, []);

  const onChildAgeChange = useCallback(
    (roomIndex: number, childIndex: number, age: number) => {
      setParams((prev) => ({
        ...prev,
        rooms: prev.rooms.map((room, i) => {
          if (i !== roomIndex) return room;
          const childAge = [...(room.childAge ?? [])];
          childAge[childIndex] = age;
          return { ...room, childAge };
        }),
      }));
    },
    []
  );

  const onSearch = useCallback(async () => {
    const hids = parseHids(hotelIdsInput);
    if (!hids.length) {
      toast.error("Enter at least one TripJack hotel ID (hid)");
      return;
    }
    if (!params.checkIn || !params.checkOut) {
      toast.error("Select check-in and check-out dates");
      return;
    }
    if (params.checkOut <= params.checkIn) {
      toast.error("Check-out must be after check-in");
      return;
    }

    for (const room of params.rooms) {
      const children = room.children ?? 0;
      if (children > 0 && (!room.childAge || room.childAge.length < children)) {
        toast.error("Enter age for each child");
        return;
      }
    }

    const correlationId = generateHotelCorrelationId();
    const request: HotelListingSearchParams = {
      ...params,
      hids,
      correlationId,
    };

    setLoading(true);
    setError(null);

    try {
      if (isStaff) {
        console.log("[hotel-search] listing request:", request);
      }

      const res = await fetch("/api/hotels/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const json = await res.json();
      if (!json.success) {
        const upstream = json.details?.upstreamUrl
          ? ` Proxy: ${json.details.upstreamUrl}`
          : "";
        throw new Error(`${json.error ?? "Hotel search failed"}${isStaff ? upstream : ""}`);
      }

      const data = json.data;
      if (isStaff) {
        console.log("[hotel-search] normalized hotels:", data.hotels);
        console.log("[hotel-search] debug:", data.debug);
      }

      saveHotelListingSession({
        request,
        correlationId: data.correlationId,
        hotels: data.hotels,
        totalResults: data.totalResults,
        currency: data.currency,
        nationality: data.nationality,
      });

      toast.success(data.message, { duration: 2500 });
      router.push("/hotels/results");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Hotel search failed";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [hotelIdsInput, params, isStaff, router]);

  return (
    <HotelSearchScreen
      params={params}
      hotelIdsInput={hotelIdsInput}
      loading={loading}
      error={error}
      onChange={onChange}
      onHotelIdsChange={setHotelIdsInput}
      onRoomChange={onRoomChange}
      onAddRoom={onAddRoom}
      onRemoveRoom={onRemoveRoom}
      onChildAgeChange={onChildAgeChange}
      onSearch={() => void onSearch()}
    />
  );
}
