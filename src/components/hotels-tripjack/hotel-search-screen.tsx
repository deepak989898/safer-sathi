"use client";

import { Building2, Calendar, Loader2, MapPin, Plus, Trash2, Users } from "lucide-react";
import {
  HotelAdminAdvancedPanel,
  HotelDestinationAutocomplete,
} from "@/components/hotels-tripjack/hotel-destination-autocomplete";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import {
  HotelCard,
  HotelFieldLabel,
  HotelInfoBanner,
  HotelPrimaryButton,
} from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI, POPULAR_DESTINATIONS } from "@/components/hotels-tripjack/hotel-ui-theme";
import type { DestinationSuggestion, TripJackHotelNationality } from "@/lib/tripjack-hotels/catalog-types";
import { MAX_HOTEL_ROOMS } from "@/lib/tripjack-hotels/catalog-types";
import type { HotelListingSearchParams, HotelRoomRequest } from "@/lib/tripjack-hotels/types";

interface HotelSearchScreenProps {
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
  onPopularDestination?: (name: string) => void;
}

export function HotelSearchScreen({
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
  onPopularDestination,
}: HotelSearchScreenProps) {
  const today = new Date().toISOString().slice(0, 10);
  const totalGuests = params.rooms.reduce(
    (sum, r) => sum + (r.adults ?? 1) + (r.children ?? 0),
    0
  );

  return (
    <HotelBookingLayout
      hero
      title="Search Hotels"
      subtitle="Search by city, destination, or hotel name. Live rates powered by TripJack."
      maxWidth="md"
    >
      <HotelCard padding="lg" className="-mt-4 md:-mt-6">
        <div className="mb-6 flex items-center gap-2">
          <Building2 className="h-5 w-5" style={{ color: HOTEL_UI.primary }} />
          <h2 className="text-lg font-bold" style={{ color: HOTEL_UI.primary }}>
            Where do you want to stay?
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <HotelFieldLabel>Destination / City</HotelFieldLabel>
            <div className="relative mt-1.5">
              <MapPin
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
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
                  inputClassName="h-12 rounded border bg-white pl-0"
                  containerRef={destinationContainerRef}
                  highlightedIndex={highlightedIndex}
                  onHighlightedIndexChange={onHighlightedIndexChange}
                />
              </div>
            </div>
          </div>

          <div>
            <HotelFieldLabel>Check-in</HotelFieldLabel>
            <div className="relative mt-1.5">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                className="h-12 w-full rounded border bg-white pl-10 pr-3 text-sm"
                style={{ borderColor: HOTEL_UI.border }}
                value={params.checkIn}
                min={today}
                onChange={(e) => onChange({ checkIn: e.target.value })}
              />
            </div>
          </div>

          <div>
            <HotelFieldLabel>Check-out</HotelFieldLabel>
            <div className="relative mt-1.5">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                className="h-12 w-full rounded border bg-white pl-10 pr-3 text-sm"
                style={{ borderColor: HOTEL_UI.border }}
                value={params.checkOut}
                min={params.checkIn || today}
                onChange={(e) => onChange({ checkOut: e.target.value })}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" style={{ color: HOTEL_UI.primary }} />
                <HotelFieldLabel>Rooms &amp; Guests</HotelFieldLabel>
                <span className="text-sm font-medium" style={{ color: HOTEL_UI.text }}>
                  {params.rooms.length} room{params.rooms.length > 1 ? "s" : ""}, {totalGuests} guest
                  {totalGuests > 1 ? "s" : ""}
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

          <div>
            <HotelFieldLabel>Nationality</HotelFieldLabel>
            {nationalities.length > 0 ? (
              <select
                className="mt-1.5 h-12 w-full rounded border bg-white px-3 text-sm"
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
                className="mt-1.5 h-12 w-full rounded border bg-white px-3 text-sm"
                style={{ borderColor: HOTEL_UI.border }}
                value={params.nationality}
                onChange={(e) => onChange({ nationality: e.target.value })}
              />
            )}
          </div>
          <div>
            <HotelFieldLabel>Currency</HotelFieldLabel>
            <input
              className="mt-1.5 h-12 w-full rounded border bg-white px-3 text-sm uppercase"
              style={{ borderColor: HOTEL_UI.border }}
              value={params.currency}
              onChange={(e) => onChange({ currency: e.target.value.toUpperCase() })}
            />
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
          <div className="mt-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6">
          <HotelPrimaryButton loading={loading} onClick={onSearch}>
            {loading ? "Searching hotels…" : "Search Hotels"}
          </HotelPrimaryButton>
        </div>
      </HotelCard>

      <div className="mt-6">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: HOTEL_UI.textMuted }}>
          Popular searches
        </p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_DESTINATIONS.map((dest) => (
            <button
              key={dest}
              type="button"
              className="rounded-full border bg-white px-4 py-2 text-sm font-medium transition hover:border-[#006CE4] hover:text-[#006CE4]"
              style={{ borderColor: HOTEL_UI.border, color: HOTEL_UI.text }}
              onClick={() => onPopularDestination?.(dest)}
            >
              {dest}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <HotelInfoBanner variant="warning">
          You can search hotels by destination only. Hotel IDs are not required for customers.
        </HotelInfoBanner>
      </div>
    </HotelBookingLayout>
  );
}
