"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Calendar,
  MapPin,
  Star,
  Users,
} from "lucide-react";
import { HotelCancellationTimeline } from "@/components/hotels-tripjack/hotel-cancellation-timeline";
import { HotelPricingDebugPanel } from "@/components/hotels-tripjack/hotel-pricing-debug-panel";
import { HotelRoomOptionCard } from "@/components/hotels-tripjack/hotel-room-option-card";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import { TripJackRelatedHotels } from "@/components/hotels-tripjack/tripjack-related-hotels";
import { HotelCard, HotelPrimaryButton, HotelStepBar } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { PackageImageGallery } from "@/components/customer/package-image-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { HOTEL_SESSION_TTL_MS } from "@/lib/tripjack-hotels/config";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { extractCityFromLocation } from "@/components/hotels-tripjack/tripjack-results-filters";
import { resolveHotelImageCandidates } from "@/lib/tripjack-hotels/hotel-images";
import { formatCurrency } from "@/lib/i18n";
import {
  ensureHotelListingSessionForDetail,
  isHotelSearchSessionExpired,
  loadHotelDetailCache,
  loadHotelListingSession,
  parseHotelDetailUrlParams,
  saveHotelDetailCache,
  saveHotelReviewPrep,
} from "@/lib/tripjack-hotels/session";
import type {
  HotelRoomRequest,
  NormalizedHotel,
  NormalizedHotelDetail,
  NormalizedHotelOption,
} from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-48 rounded bg-slate-200" />
      <div className="h-8 w-2/3 rounded bg-slate-200" />
      <div className="h-40 rounded bg-slate-200" />
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

function SelectionSidebar({
  detail,
  selectedOption,
  sessionExpired,
  onContinue,
}: {
  detail: NormalizedHotelDetail;
  selectedOption: NormalizedHotelOption | null;
  sessionExpired: boolean;
  onContinue: () => void;
}) {
  const { locale } = useAppStore();

  return (
    <Card className="sticky top-24 overflow-hidden shadow-md">
      <CardHeader className="space-y-4 border-b bg-muted/20 pb-5">
        <div className="space-y-2">
          <CardTitle className="text-lg leading-snug text-[#0c2444] md:text-xl">
            {detail.name}
          </CardTitle>
          {detail.location && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{detail.location}</span>
            </p>
          )}
        </div>

        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 shrink-0 text-primary" />
            {detail.checkIn} → {detail.checkOut}
          </li>
          <li className="flex items-center gap-2.5">
            <Users className="h-4 w-4 shrink-0 text-primary" />
            {detail.guestSummary}
          </li>
          {detail.starRating != null && detail.starRating > 0 && (
            <li className="flex items-center gap-2.5">
              <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
              {detail.starRating} Star Hotel
            </li>
          )}
          {selectedOption && (
            <li className="flex items-start gap-2.5 font-medium text-[#0c2444]">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                {selectedOption.roomName || selectedOption.roomType}
                {selectedOption.mealBasis ? ` · ${selectedOption.mealBasis}` : ""}
              </span>
            </li>
          )}
        </ul>

        <div className="border-t pt-4">
          <p className="text-xs text-muted-foreground">Selected total</p>
          <p className="text-2xl font-bold text-[#0c2444]">
            {selectedOption
              ? formatCurrency(selectedOption.pricing.totalPrice, locale)
              : "Select a room"}
          </p>
          {selectedOption?.isRefundable && (
            <Badge variant="secondary" className="mt-2">
              Refundable
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        <Button
          className="w-full"
          size="lg"
          disabled={!selectedOption || sessionExpired}
          onClick={onContinue}
        >
          Continue to Review
        </Button>
      </CardContent>
    </Card>
  );
}

export function HotelDetailClient({ hid }: { hid: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const urlParams = useMemo(
    () => parseHotelDetailUrlParams(searchParams),
    [searchParams]
  );

  const listingSession = useMemo(() => {
    ensureHotelListingSessionForDetail(hid, urlParams);
    return loadHotelListingSession();
  }, [hid, urlParams]);

  const listingHotel = useMemo(
    () => listingSession.hotels.find((h) => String(h.tjHotelId) === String(hid)) ?? null,
    [listingSession.hotels, hid]
  );

  const selectedOption: NormalizedHotelOption | null = useMemo(() => {
    if (!detail) return null;
    return detail.options.find((o) => o.optionId === selectedOptionId) ?? null;
  }, [detail, selectedOptionId]);

  const relatedCity = useMemo(() => {
    if (!detail?.location) return listingHotel?.location ? extractCityFromLocation(listingHotel.location) : "";
    return extractCityFromLocation(detail.location);
  }, [detail?.location, listingHotel?.location]);

  const loadPricing = useCallback(
    async (force = false) => {
      if (!hid) {
        setError({ message: "Hotel ID missing. Go back and select a hotel." });
        setLoading(false);
        return;
      }

      const { request, correlationId } = ensureHotelListingSessionForDetail(hid, urlParams);

      if (!request || !correlationId) {
        setError({ message: "Unable to start hotel session. Please search again.", backToSearch: true });
        setLoading(false);
        return;
      }

      if (isHotelSearchSessionExpired() && !urlParams.checkIn) {
        setSessionExpired(true);
        setError({ message: "Session expired. Please search hotels again.", backToSearch: true });
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
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load hotel pricing";
        setError({ message, retryable: true });
      } finally {
        setLoading(false);
      }
    },
    [hid, urlParams, listingSession, listingHotel?.name, isStaff, isSuperAdmin]
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

    const request = ensureHotelListingSessionForDetail(hid, urlParams).request;
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

    toast.success("Room selected. Continue to review.");
    router.push("/hotels/review");
  };

  const onViewRelatedHotel = (hotel: NormalizedHotel) => {
    if (!detail) return;
    const params = new URLSearchParams({
      checkIn: detail.checkIn,
      checkOut: detail.checkOut,
      adults: String(listingSession.request?.rooms?.[0]?.adults ?? 2),
    });
    if (relatedCity) params.set("city", relatedCity);
    router.push(`/hotels/detail/${hotel.tjHotelId}?${params.toString()}`);
  };

  const galleryImages = useMemo(() => {
    const urls: string[] = [];
    const push = (list: string[]) => {
      for (const url of list) {
        if (url && !urls.includes(url)) urls.push(url);
      }
    };

    if (listingHotel) {
      push(
        resolveHotelImageCandidates({
          heroImage: listingHotel.heroImage,
          imageUrls: listingHotel.imageUrls,
          images: listingHotel.images,
          imageUrl: listingHotel.imageUrl,
          staticContent: listingHotel.staticContent,
          options: listingHotel.options,
        })
      );
    }
    push(detail?.images ?? []);
    return urls;
  }, [listingHotel, detail?.images]);

  const backHref = listingSession.hotels.length > 1 ? "/hotels/results" : "/hotels";

  return (
    <HotelBookingLayout
      title={detail?.name ?? "Hotel details"}
      subtitle={detail ? `${detail.checkIn} → ${detail.checkOut} · ${detail.guestSummary}` : undefined}
      backHref={backHref}
      backLabel={listingSession.hotels.length > 1 ? "Back to results" : "All hotels"}
      showCountdown
      onSessionExpired={() => setSessionExpired(true)}
      maxWidth="full"
    >
      <HotelStepBar
        steps={["Search", "Select Room", "Review", "Guests", "Payment"]}
        current={1}
      />

      {loading && <DetailSkeleton />}

      {error && !loading && (
        <HotelCard className="py-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="font-semibold" style={{ color: HOTEL_UI.primary }}>
            Unable to load hotel pricing
          </p>
          <p className="mt-2 text-sm text-red-700">{error.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {error.retryable && (
              <HotelPrimaryButton className="!w-auto px-6" onClick={() => void loadPricing(true)}>
                Retry
              </HotelPrimaryButton>
            )}
            <Link href={error.backToSearch ? "/hotels/search" : backHref}>
              <HotelPrimaryButton variant="outline" className="!w-auto px-6">
                {error.backToSearch ? "Search again" : "Go back"}
              </HotelPrimaryButton>
            </Link>
          </div>
        </HotelCard>
      )}

      {detail && !loading && !error && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="space-y-6">
            {isSuperAdmin && adminDebug && (
              <HotelPricingDebugPanel
                requestBody={adminDebug.requestBody}
                rawResponse={adminDebug.rawResponse}
              />
            )}

            <HotelCard padding="sm" className="overflow-hidden">
              {galleryImages.length > 0 && (
                <PackageImageGallery
                  images={galleryImages}
                  alt={detail.name}
                  compact
                  className="px-4 pt-4"
                />
              )}
              <div className="space-y-3 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-bold md:text-3xl" style={{ color: HOTEL_UI.primary }}>
                      {detail.name}
                    </h1>
                    {detail.location && (
                      <p className="mt-2 inline-flex items-center gap-1 text-sm" style={{ color: HOTEL_UI.textMuted }}>
                        <MapPin className="h-4 w-4" style={{ color: HOTEL_UI.action }} />
                        {detail.location}
                      </p>
                    )}
                  </div>
                  {detail.starRating != null && detail.starRating > 0 && (
                    <div
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold"
                      style={{ backgroundColor: "#FFF8E6", color: "#9A7200", borderRadius: HOTEL_UI.btnRadius }}
                    >
                      <Star className="h-4 w-4 fill-[#FEBA02] text-[#FEBA02]" />
                      {detail.starRating} Star
                    </div>
                  )}
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
            </HotelCard>

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
              <h2 className="mb-3 text-lg font-bold" style={{ color: HOTEL_UI.primary }}>
                Available rooms
              </h2>
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

            <TripJackRelatedHotels
              hid={hid}
              cityName={relatedCity}
              starRating={detail.starRating}
              checkIn={detail.checkIn}
              checkOut={detail.checkOut}
              locale={locale}
              onViewHotel={onViewRelatedHotel}
            />

            <HotelCard className="sticky bottom-4 z-10 !bg-white/95 backdrop-blur lg:hidden">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs" style={{ color: HOTEL_UI.textMuted }}>
                    Selected total
                  </p>
                  <p className="text-xl font-bold" style={{ color: HOTEL_UI.primary }}>
                    {selectedOption
                      ? formatCurrency(selectedOption.pricing.totalPrice, locale)
                      : "Select a room"}
                  </p>
                </div>
                <HotelPrimaryButton
                  className="!w-auto min-w-[200px]"
                  disabled={!selectedOption || sessionExpired}
                  onClick={onContinue}
                >
                  Continue to Review
                </HotelPrimaryButton>
              </div>
            </HotelCard>
          </div>

          <div className="hidden lg:block">
            <SelectionSidebar
              detail={detail}
              selectedOption={selectedOption}
              sessionExpired={sessionExpired}
              onContinue={onContinue}
            />
          </div>
        </div>
      )}
    </HotelBookingLayout>
  );
}
