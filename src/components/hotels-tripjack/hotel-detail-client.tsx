"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Star } from "lucide-react";
import {
  CatalogDetailTabsList,
  CatalogDetailTabsTrigger,
} from "@/components/customer/catalog-detail-tabs";
import { PackageImageGallery } from "@/components/customer/package-image-gallery";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { HotelPricingDebugPanel } from "@/components/hotels-tripjack/hotel-pricing-debug-panel";
import {
  HotelAmenitiesPanel,
  HotelOverviewPanel,
} from "@/components/hotels-tripjack/hotel-detail-panels";
import { HotelRoomOptionsList } from "@/components/hotels-tripjack/hotel-room-options-list";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import { HotelCard, HotelPrimaryButton, HotelStepBar } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { HotelStayDetailsForm, type HotelStayDetails } from "@/components/hotels-tripjack/hotel-stay-details-form";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAICenter } from "@/lib/ai-center/permissions";
import { HOTEL_SESSION_TTL_MS } from "@/lib/tripjack-hotels/config";
import { canShowAdminNav } from "@/lib/navigation/role-menus";
import { findCheapestOptionId } from "@/lib/tripjack-hotels/group-room-options";
import { resolveHotelImageCandidates } from "@/lib/tripjack-hotels/hotel-images";
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

type DetailTab = "rooms" | "overview" | "amenities";

type StaticContentPreview = Pick<
  NormalizedHotelDetail,
  | "name"
  | "location"
  | "address"
  | "cityName"
  | "stateName"
  | "countryName"
  | "starRating"
  | "propertyType"
  | "contact"
  | "description"
  | "amenities"
  | "amenityGroups"
  | "policies"
  | "checkInPolicy"
  | "checkOutPolicy"
  | "geolocation"
  | "images"
>;

function DetailSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-48 rounded bg-slate-200" />
      <div className="h-8 w-2/3 rounded bg-slate-200" />
      <div className="h-32 rounded bg-slate-200" />
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
  const [staticLoading, setStaticLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>("rooms");
  const [error, setError] = useState<PricingErrorState | null>(null);
  const [detail, setDetail] = useState<NormalizedHotelDetail | null>(null);
  const [staticPreview, setStaticPreview] = useState<StaticContentPreview | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [adminDebug, setAdminDebug] = useState<{
    requestBody: unknown;
    rawResponse: unknown;
  } | null>(null);
  const [markupPercent, setMarkupPercent] = useState(0);

  const selectedOption: NormalizedHotelOption | null = useMemo(() => {
    if (!detail) return null;
    return detail.options.find((o) => o.optionId === selectedOptionId) ?? null;
  }, [detail, selectedOptionId]);

  const displayDetail = useMemo<NormalizedHotelDetail | null>(() => {
    if (detail) return detail;
    if (!staticPreview) return null;
    return {
      correlationId: "",
      hotelId: hid,
      name: staticPreview.name || listingHotel?.name || "Hotel",
      reviewHash: "",
      location: staticPreview.location || listingHotel?.location || "",
      starRating: staticPreview.starRating ?? listingHotel?.starRating ?? null,
      amenities: staticPreview.amenities ?? [],
      amenityGroups: staticPreview.amenityGroups,
      description: staticPreview.description ?? "",
      images: staticPreview.images ?? [],
      checkIn: "",
      checkOut: "",
      guestSummary: "",
      bookingNotes: [],
      options: [],
      currency: "INR",
      nationality: "106",
      fetchedAt: "",
      expiresAt: "",
      address: staticPreview.address,
      cityName: staticPreview.cityName,
      stateName: staticPreview.stateName,
      countryName: staticPreview.countryName,
      propertyType: staticPreview.propertyType,
      contact: staticPreview.contact,
      policies: staticPreview.policies,
      checkInPolicy: staticPreview.checkInPolicy,
      checkOutPolicy: staticPreview.checkOutPolicy,
      geolocation: staticPreview.geolocation,
    };
  }, [detail, staticPreview, hid, listingHotel]);

  const loadStaticContent = useCallback(async () => {
    if (!hid) return;
    setStaticLoading(true);
    try {
      const res = await fetch("/api/hotels/static-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hid }),
      });
      const json = await res.json();
      if (json.success && json.data?.content) {
        setStaticPreview(json.data.content as StaticContentPreview);
      }
    } catch (e) {
      if (isStaff) {
        console.warn("[hotel-detail] static content failed", e);
      }
    } finally {
      setStaticLoading(false);
    }
  }, [hid, isStaff]);

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
          setSelectedOptionId(findCheapestOptionId(cached.options));
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
        setMarkupPercent(Number(json.data.markupPercent ?? 0));
        setSelectedOptionId(findCheapestOptionId(next.options));

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
    void loadStaticContent();
  }, [loadStaticContent]);

  useEffect(() => {
    if (!needsStayDetails) {
      void loadPricing(false);
    }
  }, [needsStayDetails, loadPricing]);

  const onSelectRoom = (optionId: string) => {
    if (optionId === selectedOptionId) return;
    setSelectedOptionId(optionId);
    setActiveTab("rooms");
    toast.success("Room selected", { duration: 1500 });
  };

  const onConfirmRoom = (optionId: string) => {
    if (optionId !== selectedOptionId) {
      onSelectRoom(optionId);
      return;
    }
    onContinue(optionId);
  };

  const onContinue = (optionId = selectedOptionId) => {
    if (sessionExpired || isHotelSearchSessionExpired()) {
      toast.error("Session expired. Please search again.");
      router.push("/hotels/search");
      return;
    }

    const option =
      detail?.options.find((item) => item.optionId === optionId) ??
      (selectedOptionId === optionId ? selectedOption : null);

    if (!detail || !option) {
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
      selectedOptionId: option.optionId,
      selectedOption: option,
      hotelName: detail.name,
      pricing: option.pricing,
      cancellation: {
        isRefundable: option.isRefundable,
        freeCancellationUntil: option.freeCancellationUntil,
        penalties: option.penalties,
      },
      roomInfo: option.roomInfo,
      mealBasis: option.mealBasis,
      bookingNotes: [...detail.bookingNotes, ...option.bookingNotes],
      commercial: option.commercial,
      compliance: {
        gstType: option.gstType,
        panRequired: option.panRequired,
        passportRequired: option.passportRequired,
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
        optionId: option.optionId,
      });
    }

    router.push("/hotels/guests");
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
    push(staticPreview?.images ?? []);
    push(detail?.images ?? []);
    return urls;
  }, [listingHotel, staticPreview?.images, detail?.images]);

  const headerName = displayDetail?.name ?? listingHotel?.name ?? "Hotel details";
  const headerLocation = displayDetail?.location ?? listingHotel?.location;

  return (
    <HotelBookingLayout
      title={headerName}
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
        steps={["Search", "Select Room", "Guests", "Review", "Payment"]}
        current={1}
      />

      {loading && !needsStayDetails && !detail && <DetailSkeleton />}

      {needsStayDetails && !detail && listingHotel && (
        <div className="space-y-4">
          <HotelCard padding="sm" className="overflow-hidden">
            {galleryImages.length > 0 && (
              <PackageImageGallery images={galleryImages} alt={listingHotel.name} className="px-4 pt-4" />
            )}
            <div className="space-y-2 p-4 md:p-5">
              <h1 className="text-2xl font-bold md:text-3xl" style={{ color: HOTEL_UI.primary }}>
                {listingHotel.name}
              </h1>
              {headerLocation && (
                <p className="inline-flex items-center gap-1 text-sm" style={{ color: HOTEL_UI.textMuted }}>
                  <MapPin className="h-4 w-4" style={{ color: HOTEL_UI.action }} />
                  {headerLocation}
                </p>
              )}
            </div>
          </HotelCard>

          {displayDetail && !staticLoading && (
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DetailTab)}>
              <CatalogDetailTabsList>
                <CatalogDetailTabsTrigger value="overview">Overview</CatalogDetailTabsTrigger>
                <CatalogDetailTabsTrigger value="amenities">Amenities</CatalogDetailTabsTrigger>
              </CatalogDetailTabsList>
              <TabsContent value="overview" className="mt-4">
                <HotelOverviewPanel detail={displayDetail} />
              </TabsContent>
              <TabsContent value="amenities" className="mt-4">
                <HotelAmenitiesPanel detail={displayDetail} />
              </TabsContent>
            </Tabs>
          )}

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

      {detail && !error && !needsStayDetails && (
        <div className="space-y-4">
          {isSuperAdmin && adminDebug && (
            <HotelPricingDebugPanel
              requestBody={adminDebug.requestBody}
              rawResponse={adminDebug.rawResponse}
              adminMessage={undefined}
              options={detail.options}
              selectedOptionId={selectedOptionId}
              markupPercent={markupPercent}
            />
          )}

          <HotelCard padding="sm" className="overflow-hidden">
            {galleryImages.length > 0 && (
              <PackageImageGallery images={galleryImages} alt={detail.name} className="px-4 pt-4" />
            )}
            <div className="space-y-3 p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold md:text-3xl" style={{ color: HOTEL_UI.primary }}>
                    {detail.name}
                  </h1>
                  {detail.location && (
                    <p className="mt-1 inline-flex items-center gap-1 text-sm" style={{ color: HOTEL_UI.textMuted }}>
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

              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DetailTab)}>
                <CatalogDetailTabsList>
                  <CatalogDetailTabsTrigger value="rooms">Rooms</CatalogDetailTabsTrigger>
                  <CatalogDetailTabsTrigger value="overview">Overview</CatalogDetailTabsTrigger>
                  <CatalogDetailTabsTrigger value="amenities">Amenities</CatalogDetailTabsTrigger>
                </CatalogDetailTabsList>

                <TabsContent value="rooms" className="mt-4 space-y-4">
                  <div>
                    <h2 className="mb-1 text-base font-bold" style={{ color: HOTEL_UI.primary }}>
                      Available rooms
                    </h2>
                    <p className="mb-3 text-xs text-slate-500">
                      Cancellation times are shown in IST (GMT+5:30).
                    </p>
                    <div className="space-y-3">
                      <HotelRoomOptionsList
                        options={detail.options}
                        selectedOptionId={selectedOptionId}
                        locale={locale}
                        onSelect={onSelectRoom}
                        onConfirm={onConfirmRoom}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="overview" className="mt-4">
                  <HotelOverviewPanel detail={detail} />
                </TabsContent>

                <TabsContent value="amenities" className="mt-4">
                  <HotelAmenitiesPanel detail={detail} />
                </TabsContent>
              </Tabs>
            </div>
          </HotelCard>
        </div>
      )}
    </HotelBookingLayout>
  );
}
