"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HotelBookingLayout } from "@/components/hotels-tripjack/hotel-booking-layout";
import {
  HOTEL_BOOKING_STEPS,
  HotelLockedBookingSummary,
  countHotelNights,
} from "@/components/hotels-tripjack/hotel-locked-booking-summary";
import {
  HotelCard,
  HotelFieldLabel,
  HotelInfoBanner,
  HotelPrimaryButton,
  HotelPriceSummary,
  HotelStepBar,
} from "@/components/hotels-tripjack/hotel-ui-primitives";
import { HOTEL_UI } from "@/components/hotels-tripjack/hotel-ui-theme";
import { useAuth } from "@/contexts/auth-context";
import {
  firstGuestValidationError,
  guestDigitsOnly,
  guestNameOnly,
  guestPanInput,
  normalizeIndianMobile,
  normalizeGuestDetailsForm,
  type GuestFieldErrors,
  validateGuestDetailsForm,
  validatePrimaryGuestField,
  validateChildAge,
  validateGuestName,
} from "@/lib/hotels/guest-validation";
import { formatCurrency } from "@/lib/i18n";
import type { HotelGuestDetailsForm, HotelPrimaryGuestForm, HotelRoomGuestForm } from "@/lib/hotels/types";
import {
  isHotelSearchSessionExpired,
  loadHotelReviewPrep,
  loadHotelReviewResult,
  saveHotelReviewResult,
} from "@/lib/tripjack-hotels/session";
import type { NormalizedHotelReviewResult } from "@/lib/tripjack-hotels/types";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import Link from "next/link";
import { Building2 } from "lucide-react";

function buildEmptyRoomGuests(review: NormalizedHotelReviewResult): HotelRoomGuestForm[][] {
  return review.searchContext.rooms.map((room) => {
    const guests: HotelRoomGuestForm[] = [];
    for (let i = 0; i < (room.adults ?? 1); i += 1) {
      guests.push({ title: "Mr", gender: "Male", firstName: "", lastName: "", type: "ADULT" });
    }
    for (let i = 0; i < (room.children ?? 0); i += 1) {
      guests.push({
        title: "Mstr",
        gender: "Male",
        firstName: "",
        lastName: "",
        type: "CHILD",
        age: room.childAge?.[i] ?? 5,
      });
    }
    return guests;
  });
}

export function HotelGuestsClient() {
  const router = useRouter();
  const { locale } = useAppStore();
  const { user } = useAuth();
  const [review, setReview] = useState<NormalizedHotelReviewResult | null>(null);
  const [loadingReview, setLoadingReview] = useState(true);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [detailHref, setDetailHref] = useState("/hotels/results");
  const [submitting, setSubmitting] = useState(false);
  const [primaryGuest, setPrimaryGuest] = useState<HotelPrimaryGuestForm>({
    firstName: "",
    lastName: "",
    gender: "Male",
    email: "",
    mobile: "",
    countryCode: "91",
    nationality: "Indian",
    address: "",
    city: "",
    state: "",
    country: "India",
    zipCode: "",
  });
  const [roomGuests, setRoomGuests] = useState<HotelRoomGuestForm[][]>([]);
  const [fieldErrors, setFieldErrors] = useState<GuestFieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validationOptions = useMemo(
    () => ({
      panRequired: Boolean(review?.option.panRequired),
      passportRequired: Boolean(review?.option.passportRequired),
    }),
    [review]
  );

  const markTouched = useCallback((key: string) => {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);

  const setPrimaryFieldError = useCallback(
    (field: keyof HotelPrimaryGuestForm, value: string) => {
      const key = `primary.${field}`;
      const message = validatePrimaryGuestField(field, value, validationOptions);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (message) next[key] = message;
        else delete next[key];
        return next;
      });
    },
    [validationOptions]
  );

  const updatePrimaryGuest = useCallback(
    (patch: Partial<HotelPrimaryGuestForm>, validateFields?: Array<keyof HotelPrimaryGuestForm>) => {
      setPrimaryGuest((prev) => {
        const next = { ...prev, ...patch };
        for (const field of validateFields ?? (Object.keys(patch) as Array<keyof HotelPrimaryGuestForm>)) {
          if (touched[`primary.${field}`] || fieldErrors[`primary.${field}`]) {
            setPrimaryFieldError(field, String(next[field] ?? ""));
          }
        }
        return next;
      });
    },
    [fieldErrors, setPrimaryFieldError, touched]
  );

  useEffect(() => {
    void (async () => {
      if (isHotelSearchSessionExpired()) {
        toast.error("Session expired. Please search again.");
        router.push("/hotels/search");
        return;
      }

      const prep = loadHotelReviewPrep();
      if (!prep) {
        toast.error("Please select a room first.");
        router.push("/hotels/results");
        return;
      }

      setDetailHref(`/hotels/detail/${encodeURIComponent(String(prep.hotelId))}`);

      const existing = loadHotelReviewResult();
      if (
        existing &&
        existing.option.optionId === prep.selectedOptionId &&
        String(existing.tjHotelId) === String(prep.hotelId)
      ) {
        setReview(existing);
        setRoomGuests(buildEmptyRoomGuests(existing));
        setLoadingReview(false);
      } else {
        setLoadingReview(true);
        setReviewError(null);
        try {
          const res = await fetch("/api/hotels/review", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              correlationId: prep.correlationId,
              optionId: prep.selectedOptionId,
              reviewHash: prep.reviewHash,
              hid: prep.hotelId,
              hotelName: prep.hotelName,
              searchContext: prep.searchContext,
            }),
          });
          const json = await res.json();
          if (!json.success || !json.data?.review) {
            setReviewError(json.error ?? "Could not lock room price. Please try again.");
            setLoadingReview(false);
            return;
          }
          const reviewed = {
            ...(json.data.review as NormalizedHotelReviewResult),
            reviewHash: prep.reviewHash,
          };
          saveHotelReviewResult(reviewed);
          setReview(reviewed);
          setRoomGuests(buildEmptyRoomGuests(reviewed));
        } catch (error) {
          setReviewError(error instanceof Error ? error.message : "Could not lock room price.");
          setLoadingReview(false);
          return;
        }
        setLoadingReview(false);
      }

      if (user?.email) setPrimaryGuest((p) => ({ ...p, email: user.email }));
      if (user?.phone) {
        setPrimaryGuest((p) => ({
          ...p,
          mobile: normalizeIndianMobile(user.phone!),
        }));
      }
      if (user?.name) {
        const parts = user.name.split(" ");
        setPrimaryGuest((p) => ({
          ...p,
          firstName: parts[0] ?? "",
          lastName: parts.slice(1).join(" ") || parts[0] || "",
        }));
      }

      try {
        const savedGuests = sessionStorage.getItem("tripjack_hotel_guest_details");
        if (savedGuests) {
          const parsed = JSON.parse(savedGuests) as HotelGuestDetailsForm;
          if (parsed.primaryGuest) setPrimaryGuest(parsed.primaryGuest);
          if (parsed.roomGuests?.length) setRoomGuests(parsed.roomGuests);
        }
      } catch {
        // ignore corrupt draft
      }
    })();
  }, [router, user]);

  const nights = useMemo(
    () => (review ? countHotelNights(review.searchContext.checkIn, review.searchContext.checkOut) : 0),
    [review]
  );

  const updateRoomGuest = (
    roomIndex: number,
    guestIndex: number,
    patch: Partial<HotelRoomGuestForm>
  ) => {
    const prefix = `room.${roomIndex}.${guestIndex}`;
    setRoomGuests((rows) =>
      rows.map((room, ri) =>
        ri === roomIndex
          ? room.map((guest, gi) => {
              if (gi !== guestIndex) return guest;
              const next = { ...guest, ...patch };
              if (touched[`${prefix}.firstName`] || fieldErrors[`${prefix}.firstName`]) {
                const message = validateGuestName(next.firstName, "First name");
                setFieldErrors((prev) => {
                  const updated = { ...prev };
                  if (message) updated[`${prefix}.firstName`] = message;
                  else delete updated[`${prefix}.firstName`];
                  return updated;
                });
              }
              if (touched[`${prefix}.lastName`] || fieldErrors[`${prefix}.lastName`]) {
                const message = validateGuestName(next.lastName, "Last name");
                setFieldErrors((prev) => {
                  const updated = { ...prev };
                  if (message) updated[`${prefix}.lastName`] = message;
                  else delete updated[`${prefix}.lastName`];
                  return updated;
                });
              }
              if (next.type === "CHILD" && (touched[`${prefix}.age`] || fieldErrors[`${prefix}.age`])) {
                const message = validateChildAge(next.age);
                setFieldErrors((prev) => {
                  const updated = { ...prev };
                  if (message) updated[`${prefix}.age`] = message;
                  else delete updated[`${prefix}.age`];
                  return updated;
                });
              }
              return next;
            })
          : room
      )
    );
  };

  const onSubmit = async () => {
    if (!review) return;

    const guestDetails: HotelGuestDetailsForm = {
      primaryGuest,
      roomGuests,
    };

    const errors = validateGuestDetailsForm(guestDetails, {
      panRequired: review.option.panRequired,
      passportRequired: review.option.passportRequired,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setTouched(
        Object.keys(errors).reduce<Record<string, boolean>>((acc, key) => {
          acc[key] = true;
          return acc;
        }, {})
      );
      toast.error(firstGuestValidationError(errors) ?? "Please fix the highlighted fields");
      return;
    }

    const normalized = normalizeGuestDetailsForm(guestDetails, {
      panRequired: review.option.panRequired,
      passportRequired: review.option.passportRequired,
    });

    setSubmitting(true);
    try {
      sessionStorage.setItem("tripjack_hotel_guest_details", JSON.stringify(normalized));
      sessionStorage.setItem("tripjack_hotel_review_for_payment", JSON.stringify(review));
      router.push("/hotels/review");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingReview) {
    return (
      <HotelBookingLayout
        title="Guest Details"
        backHref={detailHref}
        backLabel="Back to hotel details"
        showCountdown
        maxWidth="xl"
      >
        <HotelStepBar steps={[...HOTEL_BOOKING_STEPS]} current={2} />
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded bg-slate-200" />
          <div className="h-48 rounded bg-slate-200" />
        </div>
      </HotelBookingLayout>
    );
  }

  if (reviewError || !review) {
    return (
      <HotelBookingLayout
        title="Guest Details"
        backHref={detailHref}
        backLabel="Back to hotel details"
        showCountdown
        maxWidth="xl"
      >
        <HotelStepBar steps={[...HOTEL_BOOKING_STEPS]} current={2} />
        <HotelCard className="py-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="font-semibold" style={{ color: HOTEL_UI.primary }}>
            Room price could not be locked
          </p>
          <p className="mt-2 text-sm text-red-700">{reviewError ?? "Please select a room again."}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href={detailHref}>
              <HotelPrimaryButton className="!w-auto px-6">Choose another room</HotelPrimaryButton>
            </Link>
          </div>
        </HotelCard>
      </HotelBookingLayout>
    );
  }

  const option = review.option;

  return (
    <HotelBookingLayout
      title="Guest Details"
      subtitle={review.hotelName}
      backHref={detailHref}
      backLabel="Back to hotel details"
      showCountdown
      maxWidth="xl"
    >
      <HotelStepBar steps={[...HOTEL_BOOKING_STEPS]} current={2} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <HotelLockedBookingSummary review={review} locale={locale} />

          <HotelCard>
            <h2 className="text-base font-bold" style={{ color: HOTEL_UI.primary }}>
              Primary Guest &amp; Contact
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="First name *"
                value={primaryGuest.firstName}
                error={fieldErrors["primary.firstName"]}
                onBlur={() => {
                  markTouched("primary.firstName");
                  setPrimaryFieldError("firstName", primaryGuest.firstName);
                }}
                onChange={(v) => updatePrimaryGuest({ firstName: guestNameOnly(v) }, ["firstName"])}
              />
              <Field
                label="Last name *"
                value={primaryGuest.lastName}
                error={fieldErrors["primary.lastName"]}
                onBlur={() => {
                  markTouched("primary.lastName");
                  setPrimaryFieldError("lastName", primaryGuest.lastName);
                }}
                onChange={(v) => updatePrimaryGuest({ lastName: guestNameOnly(v) }, ["lastName"])}
              />
              <Field
                label="Email *"
                type="email"
                value={primaryGuest.email}
                error={fieldErrors["primary.email"]}
                onBlur={() => {
                  markTouched("primary.email");
                  setPrimaryFieldError("email", primaryGuest.email);
                }}
                onChange={(v) => updatePrimaryGuest({ email: v }, ["email"])}
              />
              <PhoneField
                label="Phone *"
                value={primaryGuest.mobile}
                error={fieldErrors["primary.mobile"]}
                onBlur={() => {
                  markTouched("primary.mobile");
                  setPrimaryFieldError("mobile", primaryGuest.mobile);
                }}
                onChange={(v) => updatePrimaryGuest({ mobile: v }, ["mobile"])}
              />
              <Field
                label="Address *"
                className="sm:col-span-2"
                value={primaryGuest.address}
                error={fieldErrors["primary.address"]}
                onBlur={() => {
                  markTouched("primary.address");
                  setPrimaryFieldError("address", primaryGuest.address);
                }}
                onChange={(v) => updatePrimaryGuest({ address: v }, ["address"])}
              />
              <Field
                label="City *"
                value={primaryGuest.city}
                error={fieldErrors["primary.city"]}
                onBlur={() => {
                  markTouched("primary.city");
                  setPrimaryFieldError("city", primaryGuest.city);
                }}
                onChange={(v) => updatePrimaryGuest({ city: guestNameOnly(v, 80) }, ["city"])}
              />
              <Field
                label="State *"
                value={primaryGuest.state}
                error={fieldErrors["primary.state"]}
                onBlur={() => {
                  markTouched("primary.state");
                  setPrimaryFieldError("state", primaryGuest.state);
                }}
                onChange={(v) => updatePrimaryGuest({ state: guestNameOnly(v, 80) }, ["state"])}
              />
              <Field
                label="Country *"
                value={primaryGuest.country}
                error={fieldErrors["primary.country"]}
                onBlur={() => {
                  markTouched("primary.country");
                  setPrimaryFieldError("country", primaryGuest.country);
                }}
                onChange={(v) => updatePrimaryGuest({ country: v }, ["country"])}
              />
              <Field
                label="PIN code *"
                value={primaryGuest.zipCode}
                inputMode="numeric"
                maxLength={6}
                hint="6-digit PIN"
                error={fieldErrors["primary.zipCode"]}
                onBlur={() => {
                  markTouched("primary.zipCode");
                  setPrimaryFieldError("zipCode", primaryGuest.zipCode);
                }}
                onChange={(v) => updatePrimaryGuest({ zipCode: guestDigitsOnly(v, 6) }, ["zipCode"])}
              />
              {review.option.panRequired && (
                <Field
                  label="PAN number *"
                  value={primaryGuest.pan ?? ""}
                  hint="10 characters, e.g. ABCDE1234F"
                  error={fieldErrors["primary.pan"]}
                  onBlur={() => {
                    markTouched("primary.pan");
                    setPrimaryFieldError("pan", primaryGuest.pan ?? "");
                  }}
                  onChange={(v) => updatePrimaryGuest({ pan: guestPanInput(v) }, ["pan"])}
                />
              )}
              {review.option.passportRequired && (
                <>
                  <Field
                    label="Passport number *"
                    value={primaryGuest.passportNumber ?? ""}
                    error={fieldErrors["primary.passportNumber"]}
                    onBlur={() => {
                      markTouched("primary.passportNumber");
                      setPrimaryFieldError("passportNumber", primaryGuest.passportNumber ?? "");
                    }}
                    onChange={(v) =>
                      updatePrimaryGuest({ passportNumber: v.toUpperCase() }, ["passportNumber"])
                    }
                  />
                  <Field
                    label="Passport expiry *"
                    type="date"
                    value={primaryGuest.passportExpiry ?? ""}
                    error={fieldErrors["primary.passportExpiry"]}
                    onBlur={() => {
                      markTouched("primary.passportExpiry");
                      setPrimaryFieldError("passportExpiry", primaryGuest.passportExpiry ?? "");
                    }}
                    onChange={(v) => updatePrimaryGuest({ passportExpiry: v }, ["passportExpiry"])}
                  />
                </>
              )}
            </div>
          </HotelCard>

          {roomGuests.map((room, roomIndex) => (
            <HotelCard key={roomIndex}>
              <h2 className="text-base font-bold" style={{ color: HOTEL_UI.primary }}>
                Room {roomIndex + 1} — Guest names
              </h2>
              <div className="mt-4 space-y-4">
                {room.map((guest, guestIndex) => {
                  const prefix = `room.${roomIndex}.${guestIndex}`;
                  return (
                    <div key={guestIndex} className="grid gap-3 sm:grid-cols-4">
                      <Field
                        label="Title"
                        value={guest.title}
                        onChange={(v) =>
                          updateRoomGuest(roomIndex, guestIndex, {
                            title: v as HotelRoomGuestForm["title"],
                          })
                        }
                      />
                      <Field
                        label="First name *"
                        value={guest.firstName}
                        error={fieldErrors[`${prefix}.firstName`]}
                        onBlur={() => {
                          markTouched(`${prefix}.firstName`);
                          const message = validateGuestName(guest.firstName, "First name");
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            if (message) next[`${prefix}.firstName`] = message;
                            else delete next[`${prefix}.firstName`];
                            return next;
                          });
                        }}
                        onChange={(v) =>
                          updateRoomGuest(roomIndex, guestIndex, { firstName: guestNameOnly(v) })
                        }
                      />
                      <Field
                        label="Last name *"
                        value={guest.lastName}
                        error={fieldErrors[`${prefix}.lastName`]}
                        onBlur={() => {
                          markTouched(`${prefix}.lastName`);
                          const message = validateGuestName(guest.lastName, "Last name");
                          setFieldErrors((prev) => {
                            const next = { ...prev };
                            if (message) next[`${prefix}.lastName`] = message;
                            else delete next[`${prefix}.lastName`];
                            return next;
                          });
                        }}
                        onChange={(v) =>
                          updateRoomGuest(roomIndex, guestIndex, { lastName: guestNameOnly(v) })
                        }
                      />
                      {guest.type === "CHILD" ? (
                        <Field
                          label="Age *"
                          type="number"
                          value={String(guest.age ?? "")}
                          error={fieldErrors[`${prefix}.age`]}
                          onBlur={() => {
                            markTouched(`${prefix}.age`);
                            const message = validateChildAge(guest.age);
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              if (message) next[`${prefix}.age`] = message;
                              else delete next[`${prefix}.age`];
                              return next;
                            });
                          }}
                          onChange={(v) => {
                            const age = Number(v);
                            updateRoomGuest(roomIndex, guestIndex, {
                              age: Number.isFinite(age) ? age : undefined,
                            });
                          }}
                        />
                      ) : (
                        <div className="flex items-end pb-2 text-xs" style={{ color: HOTEL_UI.textMuted }}>
                          Adult
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </HotelCard>
          ))}

        </div>

        <div className="space-y-4">
          <HotelPriceSummary
            lines={[
              { label: "Room", value: option.roomInfo[0] || option.roomName },
              { label: "Nights", value: String(nights) },
              { label: "Meal plan", value: option.mealBasisLabel || option.mealBasis },
              {
                label: "Subtotal",
                value: formatCurrency(option.pricing.basePrice, locale),
              },
              {
                label: "Taxes & fees",
                value: formatCurrency(option.pricing.taxes + option.pricing.mf + option.pricing.mft, locale),
              },
            ]}
            total={formatCurrency(option.pricing.totalPrice, locale)}
            footer={
              <HotelPrimaryButton loading={submitting} onClick={() => void onSubmit()}>
                Continue to Review
              </HotelPrimaryButton>
            }
          />
          <HotelInfoBanner variant="success">
            {option.isRefundable
              ? "Free cancellation available on this rate."
              : "This rate is non-refundable."}
          </HotelInfoBanner>
        </div>
      </div>
    </HotelBookingLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  onBlur,
  type = "text",
  className,
  error,
  hint,
  inputMode,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  className?: string;
  error?: string;
  hint?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  const hasError = Boolean(error);
  return (
    <div className={className}>
      <HotelFieldLabel>{label}</HotelFieldLabel>
      <input
        className="mt-1.5 h-11 w-full rounded border bg-white px-3 text-sm"
        style={{
          borderColor: hasError ? "#dc2626" : HOTEL_UI.border,
        }}
        type={type}
        value={value}
        inputMode={inputMode}
        maxLength={maxLength}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && !hasError ? (
        <p className="mt-1 text-xs" style={{ color: HOTEL_UI.textMuted }}>
          {hint}
        </p>
      ) : null}
      {hasError ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function PhoneField({
  label,
  value,
  onChange,
  onBlur,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
}) {
  const hasError = Boolean(error);
  return (
    <div>
      <HotelFieldLabel>{label}</HotelFieldLabel>
      <div className="mt-1.5 flex overflow-hidden rounded border" style={{ borderColor: hasError ? "#dc2626" : HOTEL_UI.border }}>
        <span
          className="flex h-11 items-center border-r bg-slate-50 px-3 text-sm font-medium text-slate-600"
          style={{ borderColor: hasError ? "#dc2626" : HOTEL_UI.border }}
        >
          +91
        </span>
        <input
          className="h-11 min-w-0 flex-1 bg-white px-3 text-sm"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          value={value}
          placeholder="10-digit mobile"
          onBlur={onBlur}
          onChange={(e) => onChange(normalizeIndianMobile(e.target.value))}
        />
      </div>
      {!hasError ? (
        <p className="mt-1 text-xs" style={{ color: HOTEL_UI.textMuted }}>
          Do not include +91 or a leading 0
        </p>
      ) : (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
