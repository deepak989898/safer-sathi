"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Loader2,
  MapPin,
  Star,
} from "lucide-react";
import { HotelCancellationTimeline } from "@/components/hotels-tripjack/hotel-cancellation-timeline";
import { HotelPricingDebugPanel } from "@/components/hotels-tripjack/hotel-pricing-debug-panel";
import { HotelRoomOptionCard } from "@/components/hotels-tripjack/hotel-room-option-card";
import { HotelSessionCountdown } from "@/components/hotels-tripjack/hotel-session-countdown";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { HOTEL_SESSION_TTL_MS } from "@/lib/tripjack-hotels/config";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import {
  isHotelSearchSessionExpired,
  loadHotelDetailCache,
  loadHotelListingSession,
  saveHotelDetailCache,
  saveHotelReviewPrep,
} from "@/lib/tripjack-hotels/session";
import type {
  HotelRoomRequest,
  NormalizedHotelDetail,
  NormalizedHotelOption,
} from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-56 w-full rounded-3xl" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    </div>
  );
}

interface PricingErrorState {
  message: string;
  code?: string;
  backToSearch?: boolean;
  retryable?: boolean;
  adminMessage?: string;
}

export function HotelDetailClient({ hid }: { hid: string }) {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const isStaff = user ? canShowAdminNav(user.role) : false;
  const isSuperAdmin = user ? canAccessAICenter(user.role) : false;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PricingErrorState | null>(null);
  const [detail, setDetail] = useState<NormalizedHotelDetail | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [adminDebug, setAdminDebug] = useState<{
    requestBody: unknown;
    rawResponse: unknown;
  } | null>(null);

  const listingSession = useMemo(() => loadHotelListingSession(), []);
  const listingHotel = useMemo(
    () => listingSession.hotels.find((h) => String(h.tjHotelId) === String(hid)) ?? null,
    [listingSession.hotels, hid]
  );

  const selectedOption: NormalizedHotelOption | null = useMemo(() => {
    if (!detail) return null;
    return detail.options.find((o) => o.optionId === selectedOptionId) ?? null;
  }, [detail, selectedOptionId]);

  const loadPricing = useCallback(
    async (force = false) => {
      if (!hid) {
        setError({ message: "Hotel ID missing. Go back to results and select a hotel." });
        setLoading(false);
        return;
      }

      if (isHotelSearchSessionExpired()) {
        setSessionExpired(true);
        setError({ message: "Session expired. Please search hotels again.", backToSearch: true });
        setLoading(false);
        return;
      }

      const request = listingSession.request;
      const correlationId = listingSession.correlationId;
      if (!request || !correlationId) {
        setError({ message: "Search session expired. Please search hotels again.", backToSearch: true });
        setLoading(false);
        return;
      }

      if (!force) {
        const cached = loadHotelDetailCache(hid);
        if (cached) {
          setDetail(cached);
          setSelectedOptionId(cached.options[0]?.optionId ?? "");
          setLoading(false);
          if (isStaff) console.log("[hotel-pricing] cache hit", cached.hotelId);
          return;
        }
      }

      setLoading(true);
      setError(null);
      setAdminDebug(null);

      try {
        const body = {
          correlationId,
          hid,
          checkIn: request.checkIn,
          checkOut: request.checkOut,
          rooms: request.rooms as HotelRoomRequest[],
          currency: request.currency || listingSession.currency,
          nationality: request.nationality || listingSession.nationality,
          listingHotelName: listingHotel?.name,
        };

        if (isStaff) console.log("[hotel-pricing] request", body);

        const res = await fetch("/api/hotels/pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();

        if (!json.success) {
          setError({
            message: json.error ?? "Failed to load hotel pricing",
            code: json.details?.code,
            backToSearch: Boolean(json.details?.backToSearch),
            retryable: Boolean(json.details?.retryable),
            adminMessage: isSuperAdmin ? json.details?.adminMessage : undefined,
          });
          return;
        }

        const next = json.data.detail as NormalizedHotelDetail;
        saveHotelDetailCache(next);
        setDetail(next);
        setSelectedOptionId(next.options[0]?.optionId ?? "");

        if (isSuperAdmin && json.data.adminDebug) {
          setAdminDebug(json.data.adminDebug);
        }

        if (isStaff) {
          console.log("[hotel-pricing] response", {
            hotelId: next.hotelId,
            options: next.options.length,
            reviewHash: next.reviewHash,
            elapsedMs: json.data.elapsedMs,
          });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load hotel pricing";
        setError({ message, retryable: true });
        if (isStaff) console.error("[hotel-pricing] error", message);
      } finally {
        setLoading(false);
      }
    },
    [hid, listingSession, listingHotel?.name, isStaff, isSuperAdmin]
  );

  useEffect(() => {
    void loadPricing(false);
  }, [loadPricing]);

  const onSelectRoom = (optionId: string) => {
    setSelectedOptionId(optionId);
    toast.success("Room selected", { duration: 1500 });
  };

  const onContinue = () => {
    if (sessionExpired || isHotelSearchSessionExpired()) {
      toast.error("Session expired. Please search again.");
      router.push("/hotels/search");
      return;
    }

    if (!detail || !selectedOption) {
      toast.error("Please select a room option");
      return;
    }

    const request = listingSession.request;
    if (!request) {
      toast.error("Search session expired. Please search again.");
      router.push("/hotels/search");
      return;
    }

    const now = Date.now();
    saveHotelReviewPrep({
      correlationId: detail.correlationId,
      hotelId: detail.hotelId,
      reviewHash: detail.reviewHash,
      selectedOptionId: selectedOption.optionId,
      selectedOption,
      hotelName: detail.name,
      pricing: selectedOption.pricing,
      cancellation: {
        isRefundable: selectedOption.isRefundable,
        freeCancellationUntil: selectedOption.freeCancellationUntil,
        penalties: selectedOption.penalties,
      },
      roomInfo: selectedOption.roomInfo,
      mealBasis: selectedOption.mealBasis,
      bookingNotes: [...detail.bookingNotes, ...selectedOption.bookingNotes],
      commercial: selectedOption.commercial,
      compliance: {
        gstType: selectedOption.gstType,
        panRequired: selectedOption.panRequired,
        passportRequired: selectedOption.passportRequired,
      },
      searchContext: {
        checkIn: request.checkIn,
        checkOut: request.checkOut,
        rooms: request.rooms,
        currency: request.currency,
        nationality: request.nationality,
      },
      savedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + HOTEL_SESSION_TTL_MS).toISOString(),
    });

    if (isStaff) {
      console.log("[hotel-pricing] review prep saved", {
        correlationId: detail.correlationId,
        hotelId: detail.hotelId,
        reviewHash: detail.reviewHash,
        optionId: selectedOption.optionId,
      });
    }

    toast.success("Room selected. Continue to review.");
    router.push("/hotels/review");
  };

  const heroImage =
    detail?.images[0] ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80";

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <div className="border-b bg-white">
        <div className="container mx-auto flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/hotels/results"
            className="inline-flex items-center text-sm text-[#1a4fa3] hover:underline"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to results
          </Link>
          <HotelSessionCountdown onExpired={() => setSessionExpired(true)} />
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-6 md:py-8">
        {loading && <DetailSkeleton />}

        {error && !loading && (
          <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <p className="font-semibold text-slate-900">Unable to load hotel pricing</p>
            <p className="mt-2 text-sm text-red-700">{error.message}</p>
            {isSuperAdmin && error.adminMessage && (
              <p className="mt-2 text-xs font-medium text-violet-800">{error.adminMessage}</p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {error.retryable && (
                <Button
                  className="rounded-xl bg-[#1a4fa3] hover:bg-[#16408a]"
                  onClick={() => void loadPricing(true)}
                >
                  <Loader2 className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              )}
              {error.backToSearch ? (
                <Link href="/hotels/search">
                  <Button variant="outline" className="rounded-xl">
                    Search again
                  </Button>
                </Link>
              ) : (
                <Link href="/hotels/results">
                  <Button variant="outline" className="rounded-xl">
                    Back to results
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {detail && !loading && !error && (
          <div className="space-y-6">
            {isSuperAdmin && adminDebug && (
              <HotelPricingDebugPanel
                requestBody={adminDebug.requestBody}
                rawResponse={adminDebug.rawResponse}
              />
            )}

            <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt={detail.name}
                className="h-56 w-full object-cover md:h-72"
                loading="lazy"
              />
              <div className="space-y-3 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{detail.name}</h1>
                    {detail.location && (
                      <p className="mt-2 inline-flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-[#1a4fa3]" />
                        {detail.location}
                      </p>
                    )}
                  </div>
                  {detail.starRating != null && (
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                      <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                      {detail.starRating} Star
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                  <span className="rounded-full bg-slate-100 px-3 py-1">Check-in {detail.checkIn}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">Check-out {detail.checkOut}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1">{detail.guestSummary}</span>
                </div>

                {detail.description && (
                  <p className="text-sm leading-relaxed text-slate-600">{detail.description}</p>
                )}

                {detail.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {detail.amenities.slice(0, 12).map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {detail.bookingNotes.length > 0 && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
                <p className="mb-1 font-semibold">Booking notes</p>
                {detail.bookingNotes.map((note) => (
                  <p key={note}>• {note}</p>
                ))}
              </div>
            )}

            {selectedOption && (
              <HotelCancellationTimeline
                isRefundable={selectedOption.isRefundable}
                freeCancellationUntil={selectedOption.freeCancellationUntil}
                penalties={selectedOption.penalties}
                locale={locale}
              />
            )}

            <div>
              <h2 className="mb-3 text-xl font-bold text-slate-900">Available rooms</h2>
              <div className="space-y-4">
                {detail.options.map((option) => (
                  <HotelRoomOptionCard
                    key={option.optionId}
                    option={option}
                    selected={option.optionId === selectedOptionId}
                    locale={locale}
                    onSelect={onSelectRoom}
                  />
                ))}
              </div>
            </div>

            <div className="sticky bottom-4 z-10 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-slate-500">Selected total</p>
                  <p className="text-xl font-bold text-[#1a4fa3]">
                    {selectedOption
                      ? `${selectedOption.pricing.currency} ${selectedOption.pricing.totalPrice.toLocaleString("en-IN")}`
                      : "Select a room"}
                  </p>
                </div>
                <Button
                  className="h-12 rounded-xl bg-[#1a4fa3] px-8 text-base font-semibold hover:bg-[#16408a]"
                  disabled={!selectedOption || sessionExpired}
                  onClick={onContinue}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
