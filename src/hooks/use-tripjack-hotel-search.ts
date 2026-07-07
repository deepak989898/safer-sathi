"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { MAX_HOTEL_ROOMS } from "@/lib/tripjack-hotels/catalog-types";
import type {
  DestinationSuggestion,
  TripJackHotelNationality,
} from "@/lib/tripjack-hotels/catalog-types";
import { generateHotelCorrelationId } from "@/lib/tripjack-hotels/correlation";
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

export interface UseTripJackHotelSearchOptions {
  initialDestination?: string;
  initialParams?: Partial<HotelListingSearchParams>;
  /** When true, navigates to /hotels/results after a successful search. */
  redirectToResults?: boolean;
  onSearchSuccess?: () => void;
}

export function useTripJackHotelSearch(options: UseTripJackHotelSearchOptions = {}) {
  const {
    initialDestination = "",
    initialParams,
    redirectToResults = true,
    onSearchSuccess,
  } = options;

  const router = useRouter();
  const { user } = useAuth();
  const isStaff = user ? canShowAdminNav(user.role) : false;
  const isSuperAdmin = user ? canAccessAICenter(user.role) : false;
  const dates = useMemo(() => defaultDates(), []);

  const [destinationQuery, setDestinationQuery] = useState(initialDestination);
  const [selectedDestination, setSelectedDestination] = useState<DestinationSuggestion | null>(null);
  const [destinationSuggestions, setDestinationSuggestions] = useState<DestinationSuggestion[]>([]);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [showDestinationDropdown, setShowDestinationDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const destinationContainerRef = useRef<HTMLDivElement>(null);
  const skipDropdownRef = useRef(false);
  const [destinationError, setDestinationError] = useState<string | null>(null);

  const [adminHidsInput, setAdminHidsInput] = useState("");
  const [showAdminAdvanced, setShowAdminAdvanced] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nationalities, setNationalities] = useState<TripJackHotelNationality[]>([]);
  const [params, setParams] = useState<HotelListingSearchParams>({
    checkIn: initialParams?.checkIn ?? dates.checkIn,
    checkOut: initialParams?.checkOut ?? dates.checkOut,
    rooms: initialParams?.rooms ?? [{ adults: 2 }],
    currency: initialParams?.currency ?? "INR",
    nationality: initialParams?.nationality ?? "106",
    destination: initialDestination,
    destinationLabel: initialParams?.destinationLabel ?? initialDestination,
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
    const onDocMouseDown = (event: MouseEvent) => {
      if (
        destinationContainerRef.current &&
        !destinationContainerRef.current.contains(event.target as Node)
      ) {
        setShowDestinationDropdown(false);
        setHighlightedIndex(-1);
      }
    };

    const onDocKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowDestinationDropdown(false);
        setHighlightedIndex(-1);
        skipDropdownRef.current = true;
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, []);

  useEffect(() => {
    const q = destinationQuery.trim();
    if (skipDropdownRef.current) return;
    const shouldFetch = showDestinationDropdown || q.length >= 2;
    if (!shouldFetch) return;

    const timer = window.setTimeout(async () => {
      setDestinationLoading(true);
      try {
        const url =
          q.length >= 2
            ? `/api/hotels/destination-suggest?q=${encodeURIComponent(q)}`
            : "/api/hotels/destination-suggest";
        const res = await fetch(url, { cache: "no-store" });
        const text = await res.text();
        let json: { success?: boolean; data?: { suggestions?: DestinationSuggestion[] } };
        try {
          json = JSON.parse(text) as typeof json;
        } catch {
          setDestinationSuggestions([]);
          return;
        }
        if (json.success) {
          const suggestions = json.data?.suggestions ?? [];
          setDestinationSuggestions(suggestions);
          if (suggestions.length > 0 && !skipDropdownRef.current) {
            setShowDestinationDropdown(true);
          }
          setHighlightedIndex(-1);
        }
      } catch {
        setDestinationSuggestions([]);
      } finally {
        setDestinationLoading(false);
      }
    }, q.length >= 2 ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [destinationQuery, showDestinationDropdown]);

  useEffect(() => {
    void fetch("/api/hotels/nationalities", { cache: "force-cache" })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data.nationalities)) {
          setNationalities(json.data.nationalities);
        }
      })
      .catch(() => undefined);
  }, []);

  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!initialDestination && !initialParams) return;
    seededRef.current = true;
    if (initialDestination) {
      setDestinationQuery(initialDestination);
    }
    if (initialParams) {
      setParams((prev) => ({
        ...prev,
        ...initialParams,
        destination: initialParams.destination ?? initialDestination,
        destinationLabel: initialParams.destinationLabel ?? initialDestination,
      }));
    }
  }, [initialDestination, initialParams]);

  const onDestinationSelect = useCallback(
    (suggestion: DestinationSuggestion) => {
      skipDropdownRef.current = true;
      setDestinationQuery(suggestion.label);
      setSelectedDestination(suggestion);
      setDestinationError(null);
      setShowDestinationDropdown(false);
      setHighlightedIndex(-1);
      onChange({
        destination: suggestion.label,
        destinationLabel: suggestion.label,
      });
    },
    [onChange]
  );

  const onPopularDestination = useCallback(
    (name: string) => {
      skipDropdownRef.current = true;
      setDestinationQuery(name);
      setSelectedDestination(null);
      setDestinationError(null);
      setShowDestinationDropdown(false);
      setHighlightedIndex(-1);
      onChange({ destination: name, destinationLabel: name });
    },
    [onChange]
  );

  const onDestinationQueryChange = useCallback(
    (value: string) => {
      skipDropdownRef.current = false;
      setDestinationQuery(value);
      setSelectedDestination(null);
      setDestinationError(null);
      setShowDestinationDropdown(true);
      setHighlightedIndex(-1);
      onChange({ destination: value, destinationLabel: value });
    },
    [onChange]
  );

  const onSearch = useCallback(async () => {
    const adminHids = isSuperAdmin && adminHidsInput.trim() ? parseHids(adminHidsInput) : [];
    const destination = destinationQuery.trim();
    const destinationLabel = selectedDestination?.label ?? destination;

    if (!adminHids.length && destination.length < 2) {
      setDestinationError("Enter a destination, city, or hotel name");
      toast.error("Enter a destination, city, or hotel name");
      return;
    }

    setLoading(true);
    setError(null);
    setDestinationError(null);

    try {
      if (adminHids.length) {
        const dates = defaultDates();
        const correlationId = generateHotelCorrelationId();
        const requestBody = {
          checkIn: dates.checkIn,
          checkOut: dates.checkOut,
          rooms: [{ adults: 2 }],
          currency: "INR",
          nationality: "106",
          correlationId,
          adminOverrideHids: adminHids,
          destinationLabel: destinationLabel || "Admin HID override",
        };

        const res = await fetch("/api/hotels/listing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error ?? "Hotel search failed");
        }

        const data = json.data;
        const listingRequest: HotelListingSearchParams = {
          checkIn: dates.checkIn,
          checkOut: dates.checkOut,
          rooms: [{ adults: 2 }],
          currency: "INR",
          nationality: "106",
          destination: destinationLabel,
          destinationLabel: data.destinationLabel ?? destinationLabel,
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
      } else {
        const selectedHids =
          selectedDestination?.hids?.length &&
          (selectedDestination.type === "hotel" || selectedDestination.hids.length <= 3)
            ? selectedDestination.hids
            : undefined;

        const res = await fetch("/api/hotels/catalog-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: selectedHids ? undefined : destination,
            hids: selectedHids,
            limit: 100,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error ?? "Hotel search failed");
        }

        const data = json.data;
        const listingRequest: HotelListingSearchParams = {
          destination,
          destinationLabel: data.destinationLabel ?? destinationLabel,
          browseMode: true,
          rooms: [{ adults: 2 }],
          currency: "INR",
          nationality: "106",
        };

        saveHotelListingSession({
          request: listingRequest,
          correlationId: "",
          hotels: data.hotels,
          totalResults: data.totalResults,
          currency: "INR",
          nationality: "106",
          browseMode: true,
        });
      }

      toast.success(
        adminHids.length
          ? "Live rates loaded"
          : `Hotels found${destinationLabel ? ` for ${destinationLabel}` : ""}`,
        { duration: 2500 }
      );
      onSearchSuccess?.();
      if (redirectToResults) {
        router.push("/hotels/results");
      }
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
    isSuperAdmin,
    onSearchSuccess,
    redirectToResults,
    router,
    selectedDestination,
  ]);

  return {
    params,
    destinationQuery,
    destinationError,
    destinationSuggestions,
    destinationLoading,
    showDestinationDropdown,
    adminHidsInput,
    showAdminAdvanced,
    isSuperAdmin,
    loading,
    error,
    nationalities,
    destinationContainerRef,
    highlightedIndex,
    onChange,
    onDestinationQueryChange,
    onDestinationFocus: () => {
      if (!skipDropdownRef.current) {
        setShowDestinationDropdown(true);
      }
    },
    onDestinationBlur: () => undefined,
    onHighlightedIndexChange: setHighlightedIndex,
    onDestinationSelect,
    onAdminHidsChange: setAdminHidsInput,
    onToggleAdminAdvanced: () => setShowAdminAdvanced((prev) => !prev),
    onRoomChange,
    onAddRoom,
    onRemoveRoom,
    onChildAgeChange,
    onSearch,
    onPopularDestination,
  };
}
