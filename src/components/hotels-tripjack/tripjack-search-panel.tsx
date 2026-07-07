"use client";

import { Building2, Calendar, Loader2, MapPin, Plus, Search, Trash2, Users, Zap } from "lucide-react";
import {
  HotelAdminAdvancedPanel,
  HotelDestinationAutocomplete,
} from "@/components/hotels-tripjack/hotel-destination-autocomplete";
import {
  HotelCard,
  HotelFieldLabel,
  HotelPrimaryButton,
} from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import type { DestinationSuggestion, TripJackHotelNationality } from "@/lib/tripjack-hotels/catalog-types";
import { MAX_HOTEL_ROOMS } from "@/lib/tripjack-hotels/catalog-types";
import type { HotelListingSearchParams, HotelRoomRequest } from "@/lib/tripjack-hotels/types";
import { cn } from "@/lib/utils";

export interface TripJackSearchPanelProps {
  params: HotelListingSearchParams;
  destinationQuery: string;
  destinationError: string | null;
  destinationSuggestions: DestinationSuggestion[];
  destinationLoading: boolean;
  showDestinationDropdown: boolean;
  adminHidsInput: string;
  showAdminAdvanced: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
  error: string | null;
  nationalities: TripJackHotelNationality[];
  onChange: (patch: Partial<HotelListingSearchParams>) => void;
  onDestinationQueryChange: (value: string) => void;
  onDestinationFocus: () => void;
  onDestinationBlur: () => void;
  onDestinationSelect: (suggestion: DestinationSuggestion) => void;
  destinationContainerRef?: React.RefObject<HTMLDivElement | null>;
  highlightedIndex?: number;
  onHighlightedIndexChange?: (index: number) => void;
  onAdminHidsChange: (value: string) => void;
  onToggleAdminAdvanced: () => void;
  onRoomChange: (index: number, patch: Partial<HotelRoomRequest>) => void;
  onAddRoom: () => void;
  onRemoveRoom: (index: number) => void;
  onChildAgeChange: (roomIndex: number, childIndex: number, age: number) => void;
  onSearch: () => void;
  variant?: "full" | "compact";
  className?: string;
}

export function TripJackSearchPanel({
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
  onChange,
  onDestinationQueryChange,
  onDestinationFocus,
  onDestinationBlur,
  onDestinationSelect,
  destinationContainerRef,
  highlightedIndex,
  onHighlightedIndexChange,
  onAdminHidsChange,
  onToggleAdminAdvanced,
  onRoomChange,
  onAddRoom,
  onRemoveRoom,
  onChildAgeChange,
  onSearch,
  variant = "full",
  className,
}: TripJackSearchPanelProps) {
  const today = new Date().toISOString().slice(0, 10);
  const totalGuests = params.rooms.reduce(
    (sum, r) => sum + (r.adults ?? 1) + (r.children ?? 0),
    0
  );
  const compact = variant === "compact";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-gradient-to-br from-white to-blue-50/40 shadow-sm",
        className
      )}
      style={{ borderColor: HOTEL_UI.border }}
    >
      <div className="border-b px-4 py-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#006CE4]/10">
            <Zap className="h-4 w-4 text-[#006CE4]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0c2444] md:text-xl">
              Search live TripJack hotels
            </h2>
            <p className="text-xs text-muted-foreground md:text-sm">
              Real-time rates · INR · Nationality default India (106)
            </p>
          </div>
        </div>
      </div>

      <HotelCard padding={compact ? "sm" : "lg"} className="!rounded-none !border-0 !shadow-none">
        <div className={cn("grid gap-4", compact ? "md:grid-cols-2 lg:grid-cols-12" : "md:grid-cols-2")}>
          <div className={cn(compact ? "lg:col-span-4" : "md:col-span-2")}>
            <HotelFieldLabel>City / destination / hotel name</HotelFieldLabel>
            <div className="relative mt-1.5">
              <MapPin
                className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2"
                style={{ color: HOTEL_UI.textMuted }}
              />
              <div className="pl-9">
                <HotelDestinationAutocomplete
                  value={destinationQuery}
                  onChange={onDestinationQueryChange}
                  onSelect={onDestinationSelect}
                  suggestions={destinationSuggestions}
                  loading={destinationLoading}
                  showDropdown={showDestinationDropdown}
                  onFocus={onDestinationFocus}
                  onBlur={onDestinationBlur}
                  error={destinationError}
                  inputClassName="h-11 rounded border bg-white pl-0"
                  containerRef={destinationContainerRef}
                  highlightedIndex={highlightedIndex}
                  onHighlightedIndexChange={onHighlightedIndexChange}
                />
              </div>
            </div>
          </div>

          <div className={cn(compact ? "lg:col-span-2" : "")}>
            <HotelFieldLabel>Check-in</HotelFieldLabel>
            <div className="relative mt-1.5">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                className="h-11 w-full rounded border bg-white pl-10 pr-3 text-sm"
                style={{ borderColor: HOTEL_UI.border }}
                value={params.checkIn}
                min={today}
                onChange={(e) => onChange({ checkIn: e.target.value })}
              />
            </div>
          </div>

          <div className={cn(compact ? "lg:col-span-2" : "")}>
            <HotelFieldLabel>Check-out</HotelFieldLabel>
            <div className="relative mt-1.5">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                className="h-11 w-full rounded border bg-white pl-10 pr-3 text-sm"
                style={{ borderColor: HOTEL_UI.border }}
                value={params.checkOut}
                min={params.checkIn || today}
                onChange={(e) => onChange({ checkOut: e.target.value })}
              />
            </div>
          </div>

          {!compact && (
            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" style={{ color: HOTEL_UI.primary }} />
                  <HotelFieldLabel>Rooms &amp; Guests</HotelFieldLabel>
                  <span className="text-sm font-medium" style={{ color: HOTEL_UI.text }}>
                    {params.rooms.length} room{params.rooms.length > 1 ? "s" : ""}, {totalGuests}{" "}
                    guest{totalGuests > 1 ? "s" : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold hover:underline"
                  style={{ color: HOTEL_UI.action }}
                  onClick={onAddRoom}
                  disabled={params.rooms.length >= MAX_HOTEL_ROOMS}
                >
                  <Plus className="mr-1 inline h-4 w-4" />
                  Add room
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {params.rooms.map((room, roomIndex) => (
                  <div
                    key={roomIndex}
                    className="rounded border bg-[#FAFBFC] p-4"
                    style={{ borderColor: HOTEL_UI.border }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: HOTEL_UI.primary }}>
                        Room {roomIndex + 1}
                      </span>
                      {params.rooms.length > 1 && (
                        <button type="button" onClick={() => onRemoveRoom(roomIndex)}>
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
                            onRoomChange(roomIndex, {
                              adults: Math.max(1, Number(e.target.value) || 1),
                            })
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
                            const nextChildren = Math.max(
                              0,
                              Math.min(6, Number(e.target.value) || 0)
                            );
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
                    {(room.children ?? 0) > 0 && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {Array.from({ length: room.children ?? 0 }).map((_, childIndex) => (
                          <div key={childIndex}>
                            <HotelFieldLabel>Child {childIndex + 1} age</HotelFieldLabel>
                            <input
                              type="number"
                              min={0}
                              max={17}
                              className="mt-1 h-10 w-full rounded border bg-white px-3 text-sm"
                              style={{ borderColor: HOTEL_UI.border }}
                              value={room.childAge?.[childIndex] ?? 5}
                              onChange={(e) =>
                                onChildAgeChange(
                                  roomIndex,
                                  childIndex,
                                  Math.max(0, Number(e.target.value) || 0)
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {compact && (
            <div className="lg:col-span-2">
              <HotelFieldLabel>Rooms &amp; guests</HotelFieldLabel>
              <div
                className="mt-1.5 flex h-11 items-center rounded border bg-white px-3 text-sm"
                style={{ borderColor: HOTEL_UI.border, color: HOTEL_UI.text }}
              >
                <Users className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
                {params.rooms.length} room{params.rooms.length > 1 ? "s" : ""}, {totalGuests} guest
                {totalGuests > 1 ? "s" : ""}
              </div>
            </div>
          )}

          <div className={cn(compact ? "lg:col-span-1" : "")}>
            <HotelFieldLabel>Nationality</HotelFieldLabel>
            {nationalities.length > 0 ? (
              <select
                className="mt-1.5 h-11 w-full rounded border bg-white px-3 text-sm"
                style={{ borderColor: HOTEL_UI.border }}
                value={params.nationality}
                onChange={(e) => onChange({ nationality: e.target.value })}
              >
                {nationalities.map((nat) => (
                  <option key={nat.id} value={nat.code}>
                    {nat.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="mt-1.5 h-11 w-full rounded border bg-white px-3 text-sm"
                style={{ borderColor: HOTEL_UI.border }}
                value={params.nationality}
                onChange={(e) => onChange({ nationality: e.target.value })}
              />
            )}
          </div>

          <div className={cn(compact ? "lg:col-span-1" : "")}>
            <HotelFieldLabel>Currency</HotelFieldLabel>
            <input
              className="mt-1.5 h-11 w-full rounded border bg-white px-3 text-sm uppercase"
              style={{ borderColor: HOTEL_UI.border }}
              value={params.currency}
              onChange={(e) => onChange({ currency: e.target.value.toUpperCase() })}
            />
          </div>

          <div
            className={cn(
              "flex items-end",
              compact ? "lg:col-span-12 lg:justify-end" : "md:col-span-2"
            )}
          >
            <HotelPrimaryButton
              loading={loading}
              onClick={onSearch}
              className={cn(compact && "!w-auto px-8")}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching…
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </HotelPrimaryButton>
          </div>
        </div>

        <HotelAdminAdvancedPanel
          open={showAdminAdvanced}
          onToggle={onToggleAdminAdvanced}
          adminHidsInput={adminHidsInput}
          onAdminHidsChange={onAdminHidsChange}
          isSuperAdmin={isSuperAdmin}
        />

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
      </HotelCard>
    </div>
  );
}
