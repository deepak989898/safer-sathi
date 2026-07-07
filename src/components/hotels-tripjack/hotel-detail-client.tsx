"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Star,
} from "lucide-react";
import { HotelCancellationTimeline } from "@/components/hotels-tripjack/hotel-cancellation-timeline";
import { HotelPricingDebugPanel } from "@/components/hotels-tripjack/hotel-pricing-debug-panel";
import { HotelRoomOptionCard } from "@/components/hotels-tripjack/hotel-room-option-card";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import { HotelCard, HotelPrimaryButton, HotelStepBar } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { PackageImageGallery } from "@/components/customer/package-image-gallery";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { HOTEL_SESSION_TTL_MS } from "@/lib/tripjack-hotels/config";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { resolveHotelImageCandidates } from "@/lib/tripjack-hotels/hotel-images";
import { HotelStayDetailsForm, type HotelStayDetails } from "@/components/hotels-tripjack/hotel-stay-details-form";
import { startHotelLivePricing } from "@/lib/tripjack-hotels/featured-hotel-bootstrap";
import {
  isHotelBrowseSession,
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
      <div className="h-56 rounded bg-slate-200" />
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

export function HotelDetailClient({ hid }: { hid: string }) {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const isStaff = user ? canShowAdminNav(user.role) : false;
  const isSuperAdmin = user ? canAccessAICenter(user.role) : false;

  const listingSession = useMemo(() => loadHotelListingSession(), []);
  const listingHotel = useMemo(
    () => listingSession.hotels.find((h) => String(h.tjHotelId) === String(hid)) ?? null,
    [listingSession.hotels, hid]
  );
  const initialNeedsStayDetails = useMemo(
    () =>
      isHotelBrowseSession() ||
      listingSession.request?.browseMode ||
      !listingSession.request?.checkIn ||
      !listingSession.correlationId,
    [listingSession]
  );

  const [needsStayDetails, setNeedsStayDetails] = useState(initialNeedsStayDetails);
  const [loading, setLoading] = useState(!initialNeedsStayDetails);
  const [error, setError] = useState<PricingErrorState | null>(null);
  const [detail, setDetail] = useState<NormalizedHotelDetail | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [adminDebug, setAdminDebug] = useState<{
    requestBody: unknown;
    rawResponse: unknown;
  } | null>(null);

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

      const session = loadHotelListingSession();
      const request = session.request;
      const correlationId = session.correlationId;
      if (!request?.checkIn || !request.checkOut || !correlationId) {
        setNeedsStayDetails(true);
        setLoading(false);
        return;
      }

      setNeedsStayDetails(false);

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
          currency: request.currency || session.currency,
          nationality: request.nationality || session.nationality,
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
    [hid, listingHotel?.name, isStaff, isSuperAdmin]
  );

  const handleStaySubmit = useCallback(
    async (stay: HotelStayDetails) => {
      setLoading(true);
      setError(null);
      const live = await startHotelLivePricing({
        hid,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        rooms: stay.rooms,
        hotelName: listingHotel?.name,
        currency: listingSession.currency,
        nationality: listingSession.nationality,
      });
      if (!live.ok) {
        setError({ message: live.message, retryable: true });
        setLoading(false);
        toast.error(live.message);
        return;
      }
      setNeedsStayDetails(false);
      await loadPricing(true);
    },
    [hid, listingHotel?.name, listingSession.currency, listingSession.nationality, loadPricing]
  );

  useEffect(() => {
    if (!needsStayDetails) {
      void loadPricing(false);
    }
  }, [needsStayDetails, loadPricing]);

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

    if (!request.checkIn || !request.checkOut) {
      toast.error("Please enter check-in and check-out dates first.");
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

  return (
    <HotelBookingLayout
      title={detail?.name ?? listingHotel?.name ?? "Hotel details"}
      subtitle={
        detail
          ? `${detail.checkIn} → ${detail.checkOut} · ${detail.guestSummary}`
          : needsStayDetails
            ? "Choose stay dates and guests to view live room rates"
            : undefined
      }
      backHref="/hotels/results"
      backLabel="Back to results"
      showCountdown
      onSessionExpired={() => setSessionExpired(true)}
      maxWidth="lg"
    >
      <HotelStepBar
        steps={["Search", "Select Room", "Review", "Guests", "Payment"]}
        current={1}
      />

      {loading && !needsStayDetails && <DetailSkeleton />}

      {needsStayDetails && !detail && listingHotel && (
        <div className="space-y-6">
          <HotelCard padding="sm" className="overflow-hidden">
            {galleryImages.length > 0 && (
              <PackageImageGallery images={galleryImages} alt={listingHotel.name} className="px-4 pt-4" />
            )}
            <div className="space-y-3 p-5 md:p-6">
              <h1 className="text-2xl font-bold md:text-3xl" style={{ color: HOTEL_UI.primary }}>
                {listingHotel.name}
              </h1>
              {listingHotel.location && (
                <p className="inline-flex items-center gap-1 text-sm" style={{ color: HOTEL_UI.textMuted }}>
                  <MapPin className="h-4 w-4" style={{ color: HOTEL_UI.action }} />
                  {listingHotel.location}
                </p>
              )}
            </div>
          </HotelCard>
          <HotelStayDetailsForm
            hotelName={listingHotel.name}
            loading={loading}
            onSubmit={(stay) => void handleStaySubmit(stay)}
          />
        </div>
      )}

        {error && !loading && !needsStayDetails && (
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
              <Link href={error.backToSearch ? "/hotels/search" : "/hotels/results"}>
                <HotelPrimaryButton variant="outline" className="!w-auto px-6">
                  {error.backToSearch ? "Search again" : "Back to results"}
                </HotelPrimaryButton>
              </Link>
            </div>
          </HotelCard>
        )}

        {detail && !loading && !error && (
          <div className="space-y-6">
            {isSuperAdmin && adminDebug && (
              <HotelPricingDebugPanel
                requestBody={adminDebug.requestBody}
                rawResponse={adminDebug.rawResponse}
              />
            )}

            <HotelCard padding="sm" className="overflow-hidden">
              {galleryImages.length > 0 && (
                <PackageImageGallery images={galleryImages} alt={detail.name} className="px-4 pt-4" />
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
                  {detail.starRating != null && (
                    <div
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold"
                      style={{ backgroundColor: "#FFF8E6", color: "#9A7200", borderRadius: HOTEL_UI.btnRadius }}
                    >
                      <Star className="h-4 w-4 fill-[#FEBA02] text-[#FEBA02]" />
                      {detail.starRating} Star
                    </div>
                  )}
                </div>

                <div className="flex gap-4 border-b text-sm font-semibold" style={{ borderColor: HOTEL_UI.border, color: HOTEL_UI.primary }}>
                  <span className="border-b-2 pb-2" style={{ borderColor: HOTEL_UI.action }}>
                    Rooms
                  </span>
                  <span className="pb-2 opacity-50">Overview</span>
                  <span className="pb-2 opacity-50">Amenities</span>
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

            <HotelCard className="sticky bottom-4 z-10 !bg-white/95 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs" style={{ color: HOTEL_UI.textMuted }}>
                    Selected total
                  </p>
                  <p className="text-xl font-bold" style={{ color: HOTEL_UI.primary }}>
                    {selectedOption
                      ? `${selectedOption.pricing.currency} ${selectedOption.pricing.totalPrice.toLocaleString("en-IN")}`
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
        )}
    </HotelBookingLayout>
  );
}
