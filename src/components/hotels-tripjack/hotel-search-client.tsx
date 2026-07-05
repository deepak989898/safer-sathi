"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HotelSearchScreen } from "@/components/hotels-tripjack/hotel-search-screen";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { MAX_HOTEL_ROOMS } from "@/lib/tripjack-hotels/catalog-types";
import type { DestinationSuggestion } from "@/lib/tripjack-hotels/catalog-types";
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

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function HotelSearchClient() {
  const router = useRouter();
  const { user } = useAuth();
  const isStaff = user ? canShowAdminNav(user.role) : false;
  const isSuperAdmin = user ? canAccessAICenter(user.role) : false;
  const dates = useMemo(() => defaultDates(), []);

  const [destinationQuery, setDestinationQuery] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<DestinationSuggestion | null>(null);
  const [destinationSuggestions, setDestinationSuggestions] = useState<DestinationSuggestion[]>([]);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);

  const [adminHidsInput, setAdminHidsInput] = useState("");
  const [showAdminAdvanced, setShowAdminAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState<HotelListingSearchParams>({
    checkIn: dates.checkIn,
    checkOut: dates.checkOut,
    rooms: [{ adults: 2 }],
    currency: "INR",
    nationality: "106",
    destination: "",
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
    setParams((prev) => {
      if (prev.rooms.length >= MAX_HOTEL_ROOMS) {
        toast.error(`Maximum ${MAX_HOTEL_ROOMS} rooms allowed`);
        return prev;
      }
      return {
        ...prev,
        rooms: [...prev.rooms, { adults: 1 }],
      };
    });
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

  useEffect(() => {
    if (!showDestinationDropdown) return;
    const q = destinationQuery.trim();
    const timer = window.setTimeout(async () => {
      setDestinationLoading(true);
      try {
        const url = q.length >= 2 ? `/api/hotels/destination-suggest?q=${encodeURIComponent(q)}` : "/api/hotels/destination-suggest";
        const res = await fetch(url, { cache: "no-store" });
        const json = await res.json();
        if (json.success) {
          setDestinationSuggestions(json.data.suggestions ?? []);
        }
      } catch {
        setDestinationSuggestions([]);
      } finally {
        setDestinationLoading(false);
      }
    }, q.length >= 2 ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [destinationQuery, showDestinationDropdown]);

  const onDestinationSelect = useCallback((suggestion: DestinationSuggestion) => {
    setDestinationQuery(suggestion.label);
    setSelectedDestination(suggestion);
    setDestinationError(null);
    setShowDestinationDropdown(false);
    onChange({
      destination: suggestion.label,
      destinationLabel: suggestion.label,
    });
  }, [onChange]);

  const onSearch = useCallback(async () => {
    const adminHids = isSuperAdmin && adminHidsInput.trim() ? parseHids(adminHidsInput) : [];
    const destination = destinationQuery.trim();

    if (!adminHids.length && destination.length < 2) {
      setDestinationError("Enter a destination, city, or hotel name");
      toast.error("Enter a destination, city, or hotel name");
      return;
    }

    if (!params.checkIn || !params.checkOut) {
      toast.error("Select check-in and check-out dates");
      return;
    }

    const today = todayIsoDate();
    if (params.checkIn < today) {
      toast.error("Check-in must be today or a future date");
      return;
    }

    if (params.checkOut <= params.checkIn) {
      toast.error("Check-out must be after check-in");
      return;
    }

    if (params.rooms.length > MAX_HOTEL_ROOMS) {
      toast.error(`Maximum ${MAX_HOTEL_ROOMS} rooms allowed`);
      return;
    }

    for (const room of params.rooms) {
      if (room.adults < 1) {
        toast.error("Each room needs at least 1 adult");
        return;
      }
      const children = room.children ?? 0;
      if (children > 6) {
        toast.error("Maximum 6 children per room");
        return;
      }
      if (children > 0 && (!room.childAge || room.childAge.length < children)) {
        toast.error("Enter age for each child");
        return;
      }
    }

    const correlationId = generateHotelCorrelationId();
    const requestBody: Record<string, unknown> = {
      ...params,
      correlationId,
      destination: adminHids.length ? undefined : destination,
      destinationLabel: selectedDestination?.label ?? destination,
    };

    if (adminHids.length) {
      requestBody.adminOverrideHids = adminHids;
    }

    setLoading(true);
    setError(null);
    setDestinationError(null);

    try {
      if (isStaff) {
        console.log("[hotel-search] listing request:", requestBody);
      }

      const res = await fetch("/api/hotels/listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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

      const listingRequest: HotelListingSearchParams = {
        ...params,
        destination,
        destinationLabel: data.destinationLabel ?? destination,
        correlationId: data.correlationId,
      };

      saveHotelListingSession({
        request: listingRequest,
        correlationId: data.correlationId,
        hotels: data.hotels,
        totalResults: data.totalResults,
        currency: data.currency,
        nationality: data.nationality,
      });

      if (!data.hotels?.length) {
        toast.error(data.message ?? "No hotels found for this destination");
        setError(data.message ?? "No hotels found for this destination");
        return;
      }

      toast.success(data.message, { duration: 2500 });
      router.push("/hotels/results");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Hotel search failed";
      setError(message);
      if (message.toLowerCase().includes("no hotels found")) {
        setDestinationError(message);
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [
    adminHidsInput,
    destinationQuery,
    isStaff,
    isSuperAdmin,
    params,
    router,
    selectedDestination,
  ]);

  return (
    <HotelSearchScreen
      params={params}
      destinationQuery={destinationQuery}
      destinationError={destinationError}
      destinationSuggestions={destinationSuggestions}
      destinationLoading={destinationLoading}
      showDestinationDropdown={showDestinationDropdown}
      adminHidsInput={adminHidsInput}
      showAdminAdvanced={showAdminAdvanced}
      isSuperAdmin={isSuperAdmin}
      loading={loading}
      error={error}
      onChange={onChange}
      onDestinationQueryChange={(value) => {
        setDestinationQuery(value);
        setSelectedDestination(null);
        setDestinationError(null);
        onChange({ destination: value, destinationLabel: value });
      }}
      onDestinationFocus={() => setShowDestinationDropdown(true)}
      onDestinationBlur={() => window.setTimeout(() => setShowDestinationDropdown(false), 150)}
      onDestinationSelect={onDestinationSelect}
      onAdminHidsChange={setAdminHidsInput}
      onToggleAdminAdvanced={() => setShowAdminAdvanced((prev) => !prev)}
      onRoomChange={onRoomChange}
      onAddRoom={onAddRoom}
      onRemoveRoom={onRemoveRoom}
      onChildAgeChange={onChildAgeChange}
      onSearch={() => void onSearch()}
    />
  );
}
