"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Star } from "lucide-react";
import { HotelCancellationTimeline } from "@/components/hotels-tripjack/hotel-cancellation-timeline";
import { HotelPricingDebugPanel } from "@/components/hotels-tripjack/hotel-pricing-debug-panel";
import { HotelRoomOptionCard } from "@/components/hotels-tripjack/hotel-room-option-card";
import { HotelRoomSelectionSummary } from "@/components/hotels-tripjack/hotel-room-selection-summary";
import { RelatedLiveHotels } from "@/components/hotels-tripjack/related-live-hotels";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import { HotelCard, HotelPrimaryButton, HotelStepBar } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { PackageImageGallery } from "@/components/customer/package-image-gallery";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { HOTEL_SESSION_TTL_MS } from "@/lib/tripjack-hotels/config";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { ensureHotelDetailSearchSession } from "@/lib/tripjack-hotels/direct-detail";
import { resolveHotelImageCandidates } from "@/lib/tripjack-hotels/hotel-images";
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
    <div className="space-y-4 animate-pulse">
      <div className="h-48 rounded bg-slate-200 md:h-72" />
      <div className="h-8 w-2/3 rounded bg-slate-200" />
      <div className="h-28 rounded bg-slate-200" />
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

function extractCityName(location?: string): string {
  if (!location) return "";
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  return parts[parts.length - 1] ?? parts[0] ?? "";
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
  const [isDirectAccess, setIsDirectAccess] = useState(false);
  const [hasListingResults, setHasListingResults] = useState(false);
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
        setError({ message: "Hotel ID missing. Go back and select a hotel." });
        setLoading(false);
        return;
      }

      const searchContext = ensureHotelDetailSearchSession();
      setIsDirectAccess(searchContext.isDirectAccess);
      setHasListingResults(searchContext.hasListingResults);

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
          correlationId: searchContext.correlationId,
          hid,
          checkIn: searchContext.request.checkIn,
          checkOut: searchContext.request.checkOut,
          rooms: searchContext.request.rooms as HotelRoomRequest[],
          currency: searchContext.request.currency || "INR",
          nationality: searchContext.request.nationality || "106",
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
            message: json.error ?? "Live rates are unavailable for this hotel right now.",
            code: json.details?.code,
            backToSearch: Boolean(json.details?.backToSearch),
            retryable: Boolean(json.details?.retryable),
            adminMessage: isSuperAdmin ? json.details?.adminMessage : undefined,
          });
          return;
        }

        const next = json.data.detail as NormalizedHotelDetail;
        if (!next.options?.length) {
          setError({
            message: "No rooms available for the selected dates. Try different dates.",
            backToSearch: true,
            retryable: false,
          });
          return;
        }

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
        const message = e instanceof Error ? e.message : "Failed to load live hotel rates";
        setError({ message, retryable: true });
        if (isStaff) console.error("[hotel-pricing] error", message);
      } finally {
        setLoading(false);
      }
    },
    [hid, listingHotel?.name, isStaff, isSuperAdmin]
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

    const searchContext = ensureHotelDetailSearchSession();
    const request = searchContext.request;

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

  const backHref = hasListingResults ? "/hotels/results" : "/hotels";
  const backLabel = hasListingResults ? "Back to results" : "All hotels";
  const relatedCity = detail?.location ? extractCityName(detail.location) : listingHotel?.location ?? "";

  return (
    <HotelBookingLayout
      title={detail?.name ?? "Hotel details"}
      subtitle={
        detail
          ? `${detail.checkIn} → ${detail.checkOut} · ${detail.guestSummary}${
              isDirectAccess ? " · Default dates" : ""
            }`
          : undefined
      }
      backHref={backHref}
      backLabel={backLabel}
      showCountdown={!isDirectAccess}
      onSessionExpired={() => setSessionExpired(true)}
      maxWidth="xl"
      className="pb-28 lg:pb-8"
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
            Unable to load live rates
          </p>
          <p className="mt-2 text-sm text-red-700">{error.message}</p>
          {isDirectAccess && (
            <p className="mt-2 text-xs text-muted-foreground">
              Try modifying your travel dates or search for this destination.
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {error.retryable && (
              <HotelPrimaryButton className="!w-auto px-6" onClick={() => void loadPricing(true)}>
                Retry
              </HotelPrimaryButton>
            )}
            <Link href={error.backToSearch ? "/hotels/search" : backHref}>
              <HotelPrimaryButton variant="outline" className="!w-auto px-6">
                {error.backToSearch ? "Modify search" : backLabel}
              </HotelPrimaryButton>
            </Link>
          </div>
        </HotelCard>
      )}

      {detail && !loading && !error && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="min-w-0 space-y-5">
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
              <div className="space-y-3 p-4 md:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h1 className="text-xl font-bold md:text-2xl" style={{ color: HOTEL_UI.primary }}>
                      {detail.name}
                    </h1>
                    {detail.location && (
                      <p
                        className="mt-1 inline-flex items-center gap-1 text-sm"
                        style={{ color: HOTEL_UI.textMuted }}
                      >
                        <MapPin className="h-4 w-4 shrink-0" style={{ color: HOTEL_UI.action }} />
                        {detail.location}
                      </p>
                    )}
                  </div>
                  {detail.starRating != null && (
                    <div
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold"
                      style={{
                        backgroundColor: "#FFF8E6",
                        color: "#9A7200",
                        borderRadius: HOTEL_UI.btnRadius,
                      }}
                    >
                      <Star className="h-4 w-4 fill-[#FEBA02] text-[#FEBA02]" />
                      {detail.starRating} Star
                    </div>
                  )}
                </div>

                {detail.description && (
                  <p className="text-sm leading-relaxed text-slate-600 line-clamp-4">
                    {detail.description}
                  </p>
                )}

                {detail.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {detail.amenities.slice(0, 10).map((a) => (
                      <span
                        key={a}
                        className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs text-slate-700"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </HotelCard>

            {detail.bookingNotes.length > 0 && (
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
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
              <div className="space-y-3">
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

            <RelatedLiveHotels
              hid={hid}
              cityName={relatedCity}
              starRating={detail.starRating}
            />
          </div>

          <div className="hidden lg:block">
            <HotelRoomSelectionSummary
              selectedOption={selectedOption}
              locale={locale}
              disabled={sessionExpired}
              onContinue={onContinue}
            />
          </div>
        </div>
      )}

      {detail && !loading && !error && (
        <HotelRoomSelectionSummary
          variant="mobile-bar"
          selectedOption={selectedOption}
          locale={locale}
          disabled={sessionExpired}
          onContinue={onContinue}
        />
      )}
    </HotelBookingLayout>
  );
}
