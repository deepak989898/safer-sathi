"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, Hotel, Package, Plane, Search, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const searchTabs = [
  { id: "packages", label: "Packages", icon: Package, href: "/packages" },
  { id: "hotels", label: "Hotels", icon: Hotel, href: "/hotels" },
  { id: "vehicles", label: "Vehicles", icon: Car, href: "/vehicles" },
  { id: "flights", label: "Flights", icon: Plane, href: "/packages" },
];

interface SearchWidgetProps {
  onExpandChange?: (expanded: boolean) => void;
}

export function SearchWidget({ onExpandChange }: SearchWidgetProps) {
  const router = useRouter();
  const { locale, setSearchFilters } = useAppStore();
  const [query, setQuery] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    if (isMobile) {
      onExpandChange?.(expanded);
    }
  }, [expanded, isMobile, onExpandChange]);

  const setMobileExpanded = (value: boolean) => {
    setExpanded(value);
    if (isMobile) {
      onExpandChange?.(value);
    }
  };

  const handleSearch = (href: string) => {
    setSearchFilters({ query, checkIn, checkOut, guests: Number(guests) });
    router.push(href);
  };

  const searchForm = (
    <Tabs defaultValue="packages">
      <TabsList className="mb-3 w-full justify-start overflow-x-auto md:mb-4">
        {searchTabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5 text-xs sm:text-sm">
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {searchTabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id}>
          <div className="grid gap-3 md:grid-cols-4 md:gap-4">
            <div className="md:col-span-2">
              <Label className="text-foreground">{t(locale, "hero", "whereTo")}</Label>
              <Input
                placeholder="Delhi, Goa, Manali..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mt-1.5 bg-white dark:bg-background"
              />
            </div>
            <div>
              <Label className="text-foreground">{t(locale, "hero", "checkIn")}</Label>
              <Input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="mt-1.5 bg-white dark:bg-background"
              />
            </div>
            <div>
              <Label className="text-foreground">{t(locale, "hero", "checkOut")}</Label>
              <Input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="mt-1.5 bg-white dark:bg-background"
              />
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end md:mt-4 md:gap-4">
            <div className="sm:w-32">
              <Label className="text-foreground">{t(locale, "hero", "guests")}</Label>
              <Input
                type="number"
                min={1}
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="mt-1.5 bg-white dark:bg-background"
              />
            </div>
            <Button
              size="lg"
              className="sm:flex-1"
              onClick={() => handleSearch(tab.href)}
            >
              <Search className="mr-2 h-4 w-4" />
              {t(locale, "hero", "search")}
            </Button>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );

  return (
    <>
      {/* Mobile: collapsed pill until tapped */}
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
              <Search className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">
                {t(locale, "hero", "search")}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Packages, hotels, vehicles & more
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
                aria-expanded
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

      {/* Desktop: always expanded */}
      <div className="glass-card mx-auto hidden max-w-4xl rounded-2xl p-4 md:block md:p-6">
        {searchForm}
      </div>
    </>
  );
}
