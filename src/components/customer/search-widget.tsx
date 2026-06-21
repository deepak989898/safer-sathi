"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, Hotel, Package, Search, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SearchTabId = "packages" | "hotels" | "vehicles";

const searchTabs: {
  id: SearchTabId;
  label: string;
  icon: typeof Package;
  href: string;
}[] = [
  { id: "packages", label: "Packages", icon: Package, href: "/packages" },
  { id: "hotels", label: "Hotels", icon: Hotel, href: "/hotels" },
  { id: "vehicles", label: "Vehicles", icon: Car, href: "/vehicles" },
];

interface SearchWidgetProps {
  onExpandChange?: (expanded: boolean) => void;
  variant?: "default" | "mobile-pill";
}

export function SearchWidget({
  onExpandChange,
  variant = "default",
}: SearchWidgetProps) {
  const router = useRouter();
  const { locale, setSearchFilters } = useAppStore();
  const [activeTab, setActiveTab] = useState<SearchTabId>("packages");
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [pkgDestination, setPkgDestination] = useState("");
  const [pkgDate, setPkgDate] = useState("");
  const [pkgTravelers, setPkgTravelers] = useState("2");

  const [hotelCity, setHotelCity] = useState("");
  const [hotelCheckIn, setHotelCheckIn] = useState("");
  const [hotelCheckOut, setHotelCheckOut] = useState("");
  const [hotelGuests, setHotelGuests] = useState("2");

  const [vehicleLocation, setVehicleLocation] = useState("");
  const [vehicleDate, setVehicleDate] = useState("");
  const [vehiclePassengers, setVehiclePassengers] = useState("4");

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
      });
    } else if (tab === "hotels") {
      setSearchFilters({
        ...base,
        query: hotelCity,
        location: hotelCity,
        checkIn: hotelCheckIn,
        checkOut: hotelCheckOut,
        guests: Number(hotelGuests),
        rooms: 1,
      });
    } else {
      setSearchFilters({
        ...base,
        query: vehicleLocation,
        location: vehicleLocation,
        checkIn: vehicleDate,
        guests: Number(vehiclePassengers),
      });
    }

    router.push(href);
  };

  const activeTabMeta = searchTabs.find((tab) => tab.id === activeTab)!;
  const isMobilePill = variant === "mobile-pill";

  const searchButton = (tab: SearchTabId, href: string) => (
    <Button size="lg" className="w-full" onClick={() => runSearch(tab, href)}>
      <Search className="mr-2 h-4 w-4" />
      {t(locale, "hero", "search")}
    </Button>
  );

  const fieldClass = "mt-1.5 bg-white dark:bg-background";

  const searchForm = (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SearchTabId)}>
      <TabsList className="mb-3 w-full justify-start md:mb-4">
        {searchTabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="flex-1 gap-1.5 text-xs sm:flex-none sm:text-sm">
            <tab.icon className="h-4 w-4 shrink-0" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="packages" className="mt-0">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_140px_100px_auto] md:items-end md:gap-3">
          <div>
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
            <Label>{t(locale, "hero", "travelers")}</Label>
            <Input
              type="number"
              min={1}
              value={pkgTravelers}
              onChange={(e) => setPkgTravelers(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2 md:col-span-1">{searchButton("packages", "/packages")}</div>
        </div>
      </TabsContent>

      <TabsContent value="hotels" className="mt-0">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_140px_140px_100px_auto] md:items-end md:gap-3">
          <div>
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
          <div className="sm:col-span-2 md:col-span-1">{searchButton("hotels", "/hotels")}</div>
        </div>
      </TabsContent>

      <TabsContent value="vehicles" className="mt-0">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_140px_100px_auto] md:items-end md:gap-3">
          <div>
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
            <Label>{t(locale, "hero", "passengers")}</Label>
            <Input
              type="number"
              min={1}
              value={vehiclePassengers}
              onChange={(e) => setVehiclePassengers(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2 md:col-span-1">{searchButton("vehicles", "/vehicles")}</div>
        </div>
      </TabsContent>
    </Tabs>
  );

  const pillTrigger = (
    <button
      type="button"
      onClick={() => setMobileExpanded(true)}
      className={cn(
        "flex w-full items-center gap-3 rounded-full border border-white/70 bg-white px-4 py-3 text-left shadow-lg",
        "transition-shadow hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      )}
      aria-expanded={false}
      aria-label="Open search"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <activeTabMeta.icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">
          {t(locale, "hero", "search")} {activeTabMeta.label}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          Find your perfect trip, hotels &amp; vehicles
        </span>
      </span>
      <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );

  const expandedMobilePanel = (
    <div className="rounded-2xl border border-white/70 bg-white p-3 shadow-lg dark:bg-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{t(locale, "hero", "search")}</p>
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
  );

  if (isMobilePill) {
    return !expanded ? pillTrigger : expandedMobilePanel;
  }

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
                Tap to search packages, hotels & vehicles
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

      <div className="glass-card mx-auto hidden max-w-4xl rounded-2xl p-4 md:block md:p-5">
        {searchForm}
      </div>
    </>
  );
}
