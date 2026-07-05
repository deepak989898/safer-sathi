"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { HotelCard } from "@/components/hotels-tripjack/hotel-card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { loadHotelListingSession } from "@/lib/tripjack-hotels/session";
import type { NormalizedHotel } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";

export function HotelResultsClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const isStaff = user ? canShowAdminNav(user.role) : false;

  const [ready, setReady] = useState(false);
  const [hotels, setHotels] = useState<NormalizedHotel[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [contextLabel, setContextLabel] = useState("");

  useEffect(() => {
    const session = loadHotelListingSession();
    setHotels(session.hotels);
    setTotalResults(session.totalResults);
    const ctx = session.searchContext;
    if (ctx) {
      const parts = [
        ctx.destinationLabel || ctx.destination,
        `${ctx.checkIn} → ${ctx.checkOut}`,
      ].filter(Boolean);
      if (isStaff && Array.isArray(ctx.hids) && ctx.hids.length) {
        parts.push(`HIDs: ${(ctx.hids as number[]).slice(0, 5).join(", ")}${ctx.hids.length > 5 ? "…" : ""}`);
      }
      setContextLabel(parts.join(" · "));
    }
    if (isStaff) {
      console.log("[hotel-results] loaded hotels:", session.hotels);
    }
    setReady(true);
  }, [isStaff]);

  const onViewDetails = (hotel: NormalizedHotel) => {
    if (isStaff) {
      console.log("[hotel-results] open detail for hotel:", hotel.tjHotelId);
    }
    router.push(`/hotels/detail/${encodeURIComponent(String(hotel.tjHotelId))}`);
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] text-slate-600">
        Loading results…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-white">
        <div className="container mx-auto px-4 py-5">
          <Link
            href="/hotels/search"
            className="mb-2 inline-flex items-center text-sm text-[#1a4fa3] hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to search
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Hotel results</h1>
          <p className="mt-1 text-sm text-slate-600">{contextLabel}</p>
          <p className="mt-1 text-sm font-medium text-[#1a4fa3]">
            {totalResults} hotel(s) found
          </p>
        </div>
      </div>

      <div className="container mx-auto space-y-4 px-4 py-8">
        {hotels.length === 0 && (
          <div className="rounded-2xl border bg-white py-16 text-center shadow-sm">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-slate-900">No hotels found</p>
            <p className="mt-2 text-sm text-slate-600">
              Try different dates or hotel IDs.
            </p>
            <Link href="/hotels/search" className="mt-6 inline-block">
              <Button className="rounded-xl bg-[#1a4fa3] hover:bg-[#16408a]">
                Search again
              </Button>
            </Link>
          </div>
        )}

        {hotels.map((hotel) => (
          <HotelCard
            key={String(hotel.tjHotelId)}
            hotel={hotel}
            locale={locale}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
}
