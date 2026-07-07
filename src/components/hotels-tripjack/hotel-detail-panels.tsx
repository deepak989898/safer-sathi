"use client";

import { Clock, MapPin, Phone, ShieldCheck, Utensils } from "lucide-react";
import { HotelCancellationTimeline } from "@/components/hotels-tripjack/hotel-cancellation-timeline";
import { HotelCard } from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { formatCurrency } from "@/lib/i18n";
import type { NormalizedHotelDetail, NormalizedHotelOption } from "@/lib/tripjack-hotels/types";
import type { Locale } from "@/types";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2 last:border-0" style={{ borderColor: HOTEL_UI.border }}>
      <span className="text-sm" style={{ color: HOTEL_UI.textMuted }}>
        {label}
      </span>
      <span className="max-w-[65%] text-right text-sm font-medium" style={{ color: HOTEL_UI.primary }}>
        {value}
      </span>
    </div>
  );
}

export function HotelOverviewPanel({ detail }: { detail: NormalizedHotelDetail }) {
  const hasDescription = Boolean(detail.description?.trim());
  const hasPolicies = Boolean(detail.policies?.length);
  const hasMeta =
    detail.propertyType ||
    detail.address ||
    detail.location ||
    detail.contact ||
    detail.checkInPolicy ||
    detail.checkOutPolicy ||
    detail.starRating != null;

  if (!hasDescription && !hasPolicies && !hasMeta) {
    return (
      <HotelCard className="py-8 text-center text-sm text-slate-500">
        Hotel overview is not available yet. You can still select a room and continue booking.
      </HotelCard>
    );
  }

  return (
    <div className="space-y-4">
      {hasDescription && (
        <HotelCard padding="sm">
          <h3 className="mb-2 text-sm font-bold" style={{ color: HOTEL_UI.primary }}>
            About this property
          </h3>
          <p className="whitespace-pre-line text-sm leading-relaxed" style={{ color: HOTEL_UI.text }}>
            {detail.description}
          </p>
        </HotelCard>
      )}

      {hasMeta && (
        <HotelCard padding="sm">
          <h3 className="mb-2 text-sm font-bold" style={{ color: HOTEL_UI.primary }}>
            Property details
          </h3>
          <div>
            {detail.propertyType && <InfoRow label="Property type" value={detail.propertyType} />}
            {detail.starRating != null && (
              <InfoRow label="Star rating" value={`${detail.starRating} star`} />
            )}
            {(detail.address || detail.location) && (
              <InfoRow label="Address" value={detail.address || detail.location} />
            )}
            {detail.checkInPolicy && <InfoRow label="Check-in policy" value={detail.checkInPolicy} />}
            {detail.checkOutPolicy && <InfoRow label="Check-out policy" value={detail.checkOutPolicy} />}
            {detail.contact && <InfoRow label="Contact" value={detail.contact} />}
          </div>
        </HotelCard>
      )}

      {hasPolicies && (
        <HotelCard padding="sm">
          <h3 className="mb-2 text-sm font-bold" style={{ color: HOTEL_UI.primary }}>
            Hotel policies
          </h3>
          <ul className="space-y-2 text-sm" style={{ color: HOTEL_UI.text }}>
            {detail.policies!.map((policy) => (
              <li key={policy} className="flex gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: HOTEL_UI.action }} />
                <span>{policy}</span>
              </li>
            ))}
          </ul>
        </HotelCard>
      )}
    </div>
  );
}

export function HotelAmenitiesPanel({ detail }: { detail: NormalizedHotelDetail }) {
  const groups =
    detail.amenityGroups?.length
      ? detail.amenityGroups
      : detail.amenities.length
        ? [{ label: "Hotel amenities", items: detail.amenities }]
        : [];

  if (!groups.length) {
    return (
      <HotelCard className="py-8 text-center text-sm text-slate-500">
        Amenity details are not available for this hotel right now.
      </HotelCard>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <HotelCard key={group.label} padding="sm">
          <h3 className="mb-3 text-sm font-bold" style={{ color: HOTEL_UI.primary }}>
            {group.label}
          </h3>
          <div className="flex flex-wrap gap-2">
            {group.items.map((item) => (
              <span
                key={`${group.label}-${item}`}
                className="rounded-full border bg-white px-3 py-1.5 text-xs font-medium"
                style={{ borderColor: HOTEL_UI.border, color: HOTEL_UI.text }}
              >
                {item}
              </span>
            ))}
          </div>
        </HotelCard>
      ))}
    </div>
  );
}

export function HotelSelectedRoomCard({
  option,
  detail,
  locale,
}: {
  option: NormalizedHotelOption;
  detail: NormalizedHotelDetail;
  locale: Locale;
}) {
  const roomTitle = option.roomInfo[0] || option.roomName;

  return (
    <div className="space-y-4">
      <HotelCard padding="sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: HOTEL_UI.textMuted }}>
              Selected room details
            </p>
            <h3 className="mt-1 text-lg font-bold" style={{ color: HOTEL_UI.primary }}>
              {roomTitle}
            </h3>
            <p className="mt-1 text-sm" style={{ color: HOTEL_UI.textMuted }}>
              {option.mealBasisLabel || option.mealBasis || "Room only"}
              {" · "}
              {option.isRefundable ? "Refundable" : "Non-refundable"}
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-slate-50 px-4 py-3 text-right">
            <p className="text-xl font-bold" style={{ color: HOTEL_UI.primary }}>
              {formatCurrency(option.pricing.totalPrice, locale)}
            </p>
            <p className="text-xs" style={{ color: HOTEL_UI.textMuted }}>
              incl. taxes · {option.pricing.currency}
            </p>
          </div>
        </div>

        {option.roomInfo.length > 1 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: HOTEL_UI.textMuted }}>
              Room info
            </p>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: HOTEL_UI.text }}>
              {option.roomInfo.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </div>
        )}

        {option.inclusions.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide" style={{ color: HOTEL_UI.textMuted }}>
              <Utensils className="h-3.5 w-3.5" />
              Inclusions
            </p>
            <div className="flex flex-wrap gap-2">
              {option.inclusions.map((item) => (
                <span
                  key={item}
                  className="rounded-full border bg-white px-3 py-1 text-xs"
                  style={{ borderColor: HOTEL_UI.border }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {option.roomFeatures.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: HOTEL_UI.textMuted }}>
              Room amenities
            </p>
            <div className="flex flex-wrap gap-2">
              {option.roomFeatures.map((item) => (
                <span
                  key={item}
                  className="rounded-full border bg-white px-3 py-1 text-xs"
                  style={{ borderColor: HOTEL_UI.border }}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {(option.bookingNotes.length > 0 || detail.bookingNotes.length > 0) && (
          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-950">
            <p className="mb-1 font-semibold">Booking notes</p>
            {[...detail.bookingNotes, ...option.bookingNotes].map((note) => (
              <p key={note}>• {note}</p>
            ))}
          </div>
        )}

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {option.roomCapacity && (
            <div className="inline-flex items-center gap-2" style={{ color: HOTEL_UI.textMuted }}>
              <Clock className="h-4 w-4" />
              {option.roomCapacity}
            </div>
          )}
          {detail.location && (
            <div className="inline-flex items-center gap-2" style={{ color: HOTEL_UI.textMuted }}>
              <MapPin className="h-4 w-4" />
              {detail.cityName || detail.location}
            </div>
          )}
          {detail.contact && (
            <div className="inline-flex items-center gap-2" style={{ color: HOTEL_UI.textMuted }}>
              <Phone className="h-4 w-4" />
              {detail.contact}
            </div>
          )}
        </div>
      </HotelCard>

      <HotelCancellationTimeline
        isRefundable={option.isRefundable}
        freeCancellationUntil={option.freeCancellationUntil}
        penalties={option.penalties}
        locale={locale}
      />
    </div>
  );
}
