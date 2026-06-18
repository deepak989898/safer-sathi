"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, Hotel, Package, Plane, Search, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import type { PackageCategory, VehicleType } from "@/types";
import { cn } from "@/lib/utils";

type SearchTabId = "packages" | "hotels" | "vehicles" | "flights";

const searchTabs: {
  id: SearchTabId;
  label: string;
  icon: typeof Package;
  href: string;
}[] = [
  { id: "packages", label: "Packages", icon: Package, href: "/packages" },
  { id: "hotels", label: "Hotels", icon: Hotel, href: "/hotels" },
  { id: "vehicles", label: "Vehicles", icon: Car, href: "/vehicles" },
  { id: "flights", label: "Flights", icon: Plane, href: "/packages" },
];

const PACKAGE_CATEGORIES: { id: PackageCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "domestic", label: "Domestic" },
  { id: "honeymoon", label: "Honeymoon" },
  { id: "adventure", label: "Adventure" },
  { id: "religious", label: "Religious" },
  { id: "family", label: "Family" },
];

const VEHICLE_TYPES: { id: VehicleType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "car", label: "Car" },
  { id: "suv", label: "SUV" },
  { id: "luxury", label: "Luxury" },
  { id: "tempo_traveller", label: "Tempo" },
  { id: "bus", label: "Bus" },
];

interface SearchWidgetProps {
  onExpandChange?: (expanded: boolean) => void;
}

export function SearchWidget({ onExpandChange }: SearchWidgetProps) {
  const router = useRouter();
  const { locale, setSearchFilters } = useAppStore();
  const [activeTab, setActiveTab] = useState<SearchTabId>("packages");
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Packages
  const [pkgDestination, setPkgDestination] = useState("");
  const [pkgDate, setPkgDate] = useState("");
  const [pkgDuration, setPkgDuration] = useState("5");
  const [pkgTravelers, setPkgTravelers] = useState("2");
  const [pkgCategory, setPkgCategory] = useState<string>("all");

  // Hotels
  const [hotelCity, setHotelCity] = useState("");
  const [hotelCheckIn, setHotelCheckIn] = useState("");
  const [hotelCheckOut, setHotelCheckOut] = useState("");
  const [hotelGuests, setHotelGuests] = useState("2");
  const [hotelRooms, setHotelRooms] = useState("1");

  // Vehicles
  const [vehicleLocation, setVehicleLocation] = useState("");
  const [vehicleDate, setVehicleDate] = useState("");
  const [vehicleReturnDate, setVehicleReturnDate] = useState("");
  const [vehicleMode, setVehicleMode] = useState<"day" | "km">("day");
  const [vehicleKm, setVehicleKm] = useState("100");
  const [vehiclePassengers, setVehiclePassengers] = useState("4");
  const [vehicleType, setVehicleType] = useState<string>("all");

  // Flights
  const [flightFrom, setFlightFrom] = useState("");
  const [flightTo, setFlightTo] = useState("");
  const [flightDepart, setFlightDepart] = useState("");
  const [flightReturn, setFlightReturn] = useState("");
  const [flightPassengers, setFlightPassengers] = useState("1");
  const [flightClass, setFlightClass] = useState<string>("economy");

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      onExpandChange?.(mobile ? expanded : true);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [expanded, onExpandChange]);

  useEffect(() => {
    if (isMobile) onExpandChange?.(expanded);
  }, [expanded, isMobile, onExpandChange]);

  const setMobileExpanded = (value: boolean) => {
    setExpanded(value);
    if (isMobile) onExpandChange?.(value);
  };

  const runSearch = (tab: SearchTabId, href: string) => {
    const base = { searchTab: tab };

    if (tab === "packages") {
      setSearchFilters({
        ...base,
        query: pkgDestination,
        checkIn: pkgDate,
        guests: Number(pkgTravelers),
        durationDays: Number(pkgDuration),
        packageCategory:
          pkgCategory !== "all" ? (pkgCategory as PackageCategory) : undefined,
      });
    } else if (tab === "hotels") {
      setSearchFilters({
        ...base,
        query: hotelCity,
        location: hotelCity,
        checkIn: hotelCheckIn,
        checkOut: hotelCheckOut,
        guests: Number(hotelGuests),
        rooms: Number(hotelRooms),
      });
    } else if (tab === "vehicles") {
      setSearchFilters({
        ...base,
        query: vehicleLocation,
        location: vehicleLocation,
        checkIn: vehicleDate,
        checkOut: vehicleMode === "day" ? vehicleReturnDate : undefined,
        guests: Number(vehiclePassengers),
        vehicleBookingMode: vehicleMode,
        distanceKm: vehicleMode === "km" ? Number(vehicleKm) : undefined,
        vehicleType:
          vehicleType !== "all" ? (vehicleType as VehicleType) : undefined,
      });
    } else {
      setSearchFilters({
        ...base,
        fromCity: flightFrom,
        toCity: flightTo,
        query: flightTo || flightFrom,
        checkIn: flightDepart,
        checkOut: flightReturn || undefined,
        travelers: Number(flightPassengers),
        flightClass: flightClass as "economy" | "premium" | "business",
      });
    }

    router.push(href);
  };

  const activeTabMeta = searchTabs.find((tab) => tab.id === activeTab)!;

  const searchButton = (tab: SearchTabId, href: string) => (
    <Button size="lg" className="w-full sm:flex-1" onClick={() => runSearch(tab, href)}>
      <Search className="mr-2 h-4 w-4" />
      {t(locale, "hero", "search")}
    </Button>
  );

  const fieldClass = "mt-1.5 bg-white dark:bg-background";

  const searchForm = (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SearchTabId)}>
      <TabsList className="mb-3 w-full justify-start overflow-x-auto md:mb-4">
        {searchTabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs sm:text-sm">
            <tab.icon className="h-4 w-4 shrink-0" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Packages */}
      <TabsContent value="packages" className="space-y-3 md:space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
          <div className="sm:col-span-2">
            <Label>{t(locale, "hero", "destination")}</Label>
            <Input
              placeholder="Rajasthan, Kerala, Goa..."
              value={pkgDestination}
              onChange={(e) => setPkgDestination(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "travelDate")}</Label>
            <Input
              type="date"
              value={pkgDate}
              onChange={(e) => setPkgDate(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "duration")}</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={pkgDuration}
              onChange={(e) => setPkgDuration(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
          <div>
            <Label>{t(locale, "hero", "travelers")}</Label>
            <Input
              type="number"
              min={1}
              value={pkgTravelers}
              onChange={(e) => setPkgTravelers(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "category")}</Label>
            <Select value={pkgCategory} onValueChange={(v) => v && setPkgCategory(v)}>
              <SelectTrigger className={cn("w-full", fieldClass)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 flex items-end">{searchButton("packages", "/packages")}</div>
        </div>
      </TabsContent>

      {/* Hotels */}
      <TabsContent value="hotels" className="space-y-3 md:space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
          <div className="sm:col-span-2">
            <Label>{t(locale, "hero", "city")}</Label>
            <Input
              placeholder="Jaipur, Goa, Manali..."
              value={hotelCity}
              onChange={(e) => setHotelCity(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "checkIn")}</Label>
            <Input
              type="date"
              value={hotelCheckIn}
              onChange={(e) => setHotelCheckIn(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "checkOut")}</Label>
            <Input
              type="date"
              value={hotelCheckOut}
              onChange={(e) => setHotelCheckOut(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
          <div>
            <Label>{t(locale, "hero", "guests")}</Label>
            <Input
              type="number"
              min={1}
              value={hotelGuests}
              onChange={(e) => setHotelGuests(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "rooms")}</Label>
            <Input
              type="number"
              min={1}
              value={hotelRooms}
              onChange={(e) => setHotelRooms(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2 flex items-end">{searchButton("hotels", "/hotels")}</div>
        </div>
      </TabsContent>

      {/* Vehicles */}
      <TabsContent value="vehicles" className="space-y-3 md:space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
          <div className="sm:col-span-2">
            <Label>{t(locale, "hero", "pickupLocation")}</Label>
            <Input
              placeholder="Delhi, Mumbai, Jaipur..."
              value={vehicleLocation}
              onChange={(e) => setVehicleLocation(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "travelDate")}</Label>
            <Input
              type="date"
              value={vehicleDate}
              onChange={(e) => setVehicleDate(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "bookingType")}</Label>
            <Select
              value={vehicleMode}
              onValueChange={(v) => setVehicleMode(v as "day" | "km")}
            >
              <SelectTrigger className={cn("w-full", fieldClass)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">{t(locale, "hero", "perDay")}</SelectItem>
                <SelectItem value="km">{t(locale, "hero", "perKm")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
          {vehicleMode === "day" ? (
            <div>
              <Label>{t(locale, "hero", "returnDate")}</Label>
              <Input
                type="date"
                value={vehicleReturnDate}
                onChange={(e) => setVehicleReturnDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          ) : (
            <div>
              <Label>{t(locale, "hero", "distanceKm")}</Label>
              <Input
                type="number"
                min={50}
                step={10}
                value={vehicleKm}
                onChange={(e) => setVehicleKm(e.target.value)}
                className={fieldClass}
              />
            </div>
          )}
          <div>
            <Label>{t(locale, "hero", "passengers")}</Label>
            <Input
              type="number"
              min={1}
              value={vehiclePassengers}
              onChange={(e) => setVehiclePassengers(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "nav", "vehicles")} type</Label>
            <Select value={vehicleType} onValueChange={(v) => v && setVehicleType(v)}>
              <SelectTrigger className={cn("w-full", fieldClass)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((vt) => (
                  <SelectItem key={vt.id} value={vt.id}>
                    {vt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">{searchButton("vehicles", "/vehicles")}</div>
        </div>
      </TabsContent>

      {/* Flights */}
      <TabsContent value="flights" className="space-y-3 md:space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
          <div>
            <Label>{t(locale, "hero", "from")}</Label>
            <Input
              placeholder="Delhi (DEL)"
              value={flightFrom}
              onChange={(e) => setFlightFrom(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "to")}</Label>
            <Input
              placeholder="Mumbai (BOM)"
              value={flightTo}
              onChange={(e) => setFlightTo(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "departure")}</Label>
            <Input
              type="date"
              value={flightDepart}
              onChange={(e) => setFlightDepart(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "returnFlight")}</Label>
            <Input
              type="date"
              value={flightReturn}
              onChange={(e) => setFlightReturn(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-4">
          <div>
            <Label>{t(locale, "hero", "passengers")}</Label>
            <Input
              type="number"
              min={1}
              value={flightPassengers}
              onChange={(e) => setFlightPassengers(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <Label>{t(locale, "hero", "travelClass")}</Label>
            <Select value={flightClass} onValueChange={(v) => v && setFlightClass(v)}>
              <SelectTrigger className={cn("w-full", fieldClass)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="economy">{t(locale, "hero", "economy")}</SelectItem>
                <SelectItem value="premium">{t(locale, "hero", "premium")}</SelectItem>
                <SelectItem value="business">{t(locale, "hero", "business")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 flex items-end">{searchButton("flights", "/packages")}</div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <>
      <div className="md:hidden">
        {!expanded ? (
          <button
            type="button"
            onClick={() => setMobileExpanded(true)}
            className={cn(
              "glass-card mx-auto flex w-full max-w-md items-center gap-3 rounded-full px-4 py-3 text-left",
              "transition-shadow hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            )}
            aria-expanded={false}
            aria-label="Open search"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <activeTabMeta.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {t(locale, "hero", "search")} {activeTabMeta.label}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Tap to choose category & details
              </span>
            </span>
          </button>
        ) : (
          <div className="glass-card mx-auto max-w-lg rounded-2xl p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">
                {t(locale, "hero", "search")}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 px-2 text-xs"
                onClick={() => setMobileExpanded(false)}
                aria-label="Close search"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                Collapse
              </Button>
            </div>
            {searchForm}
          </div>
        )}
      </div>

      <div className="glass-card mx-auto hidden max-w-4xl rounded-2xl p-4 md:block md:p-6">
        {searchForm}
      </div>
    </>
  );
}
