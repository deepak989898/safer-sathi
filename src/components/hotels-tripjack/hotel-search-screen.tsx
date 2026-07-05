"use client";

import { Building2, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HotelAdminAdvancedPanel,
  HotelDestinationAutocomplete,
} from "@/components/hotels-tripjack/hotel-destination-autocomplete";
import type { DestinationSuggestion, TripJackHotelNationality } from "@/lib/tripjack-hotels/catalog-types";
import { MAX_HOTEL_ROOMS } from "@/lib/tripjack-hotels/catalog-types";
import type { HotelListingSearchParams, HotelRoomRequest } from "@/lib/tripjack-hotels/types";
import { cn } from "@/lib/utils";

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
  onAdminHidsChange: (value: string) => void;
  onToggleAdminAdvanced: () => void;
  onRoomChange: (index: number, patch: Partial<HotelRoomRequest>) => void;
  onAddRoom: () => void;
  onRemoveRoom: (index: number) => void;
  onChildAgeChange: (roomIndex: number, childIndex: number, age: number) => void;
  onSearch: () => void;
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
  onAdminHidsChange,
  onToggleAdminAdvanced,
  onRoomChange,
  onAddRoom,
  onRemoveRoom,
  onChildAgeChange,
  onSearch,
}: HotelSearchScreenProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="border-b bg-gradient-to-r from-[#1a4fa3] to-[#2563c9] text-white">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Building2 className="h-3.5 w-3.5" />
            TripJack Hotels
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Search Hotels</h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100">
            Search by city, destination, or hotel name. Live rates powered by TripJack.
          </p>
        </div>
      </section>

      <section className="container mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-3xl border border-white bg-white p-5 shadow-xl shadow-blue-900/5 md:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
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
            />

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Check-in
              </Label>
              <Input
                type="date"
                className="mt-2 h-12 rounded-xl bg-slate-50"
                value={params.checkIn}
                min={today}
                onChange={(e) => onChange({ checkIn: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Check-out
              </Label>
              <Input
                type="date"
                className="mt-2 h-12 rounded-xl bg-slate-50"
                value={params.checkOut}
                min={params.checkIn || today}
                onChange={(e) => onChange({ checkOut: e.target.value })}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nationality
              </Label>
              {nationalities.length > 0 ? (
                <select
                  className="mt-2 flex h-12 w-full rounded-xl border border-input bg-slate-50 px-3 text-sm"
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
                <Input
                  className="mt-2 h-12 rounded-xl bg-slate-50"
                  value={params.nationality}
                  onChange={(e) => onChange({ nationality: e.target.value })}
                />
              )}
              <p className="mt-1 text-xs text-slate-500">
                {nationalities.length > 0 ? "Synced from TripJack" : "Default 106 = India"}
              </p>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Currency
              </Label>
              <Input
                className="mt-2 h-12 rounded-xl bg-slate-50"
                value={params.currency}
                onChange={(e) => onChange({ currency: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">Rooms</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAddRoom}
                disabled={params.rooms.length >= MAX_HOTEL_ROOMS}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add room
              </Button>
            </div>

            {params.rooms.map((room, roomIndex) => {
              const children = room.children ?? 0;
              return (
                <div
                  key={roomIndex}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Room {roomIndex + 1}</p>
                    {params.rooms.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveRoom(roomIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Adults</Label>
                      <Input
                        type="number"
                        min={1}
                        max={8}
                        className="mt-2 h-11 rounded-xl bg-white"
                        value={room.adults}
                        onChange={(e) =>
                          onRoomChange(roomIndex, {
                            adults: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Children</Label>
                      <Input
                        type="number"
                        min={0}
                        max={6}
                        className="mt-2 h-11 rounded-xl bg-white"
                        value={children}
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
                  {children > 0 && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {Array.from({ length: children }).map((_, childIndex) => (
                        <div key={childIndex}>
                          <Label>Child {childIndex + 1} age</Label>
                          <Input
                            type="number"
                            min={0}
                            max={17}
                            className="mt-2 h-11 rounded-xl bg-white"
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
              );
            })}
          </div>

          <HotelAdminAdvancedPanel
            open={showAdminAdvanced}
            onToggle={onToggleAdminAdvanced}
            adminHidsInput={adminHidsInput}
            onAdminHidsChange={onAdminHidsChange}
            isSuperAdmin={isSuperAdmin}
          />

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <Button
            className={cn(
              "mt-6 h-12 w-full rounded-xl bg-[#1a4fa3] text-base font-semibold hover:bg-[#16408a]"
            )}
            onClick={onSearch}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Searching hotels...
              </>
            ) : (
              "Search Hotels"
            )}
          </Button>
        </div>
      </section>
    </div>
  );
}
