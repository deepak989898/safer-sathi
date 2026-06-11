"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hotel, Package, Plane, Search, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/store/app-store";
import { t } from "@/lib/i18n";

const searchTabs = [
  { id: "packages", label: "Packages", icon: Package, href: "/packages" },
  { id: "hotels", label: "Hotels", icon: Hotel, href: "/hotels" },
  { id: "vehicles", label: "Vehicles", icon: Car, href: "/vehicles" },
  { id: "flights", label: "Flights", icon: Plane, href: "/packages" },
];

export function SearchWidget() {
  const router = useRouter();
  const { locale, setSearchFilters } = useAppStore();
  const [query, setQuery] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");

  const handleSearch = (href: string) => {
    setSearchFilters({ query, checkIn, checkOut, guests: Number(guests) });
    router.push(href);
  };

  return (
    <div className="glass-card mx-auto max-w-4xl rounded-2xl p-4 md:p-6">
      <Tabs defaultValue="packages">
        <TabsList className="mb-4 w-full justify-start overflow-x-auto">
          {searchTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1.5">
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {searchTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id}>
            <div className="grid gap-4 md:grid-cols-4">
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
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
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
    </div>
  );
}
