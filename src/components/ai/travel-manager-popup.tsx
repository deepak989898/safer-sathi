"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Mic, MicOff, Send, X, Check, Fuel, MapPin, Users } from "lucide-react";
import { AiAssistantIcon } from "@/components/icons/ai-assistant-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { mergePreferences, memoryFromState } from "@/lib/ai/travel-manager/geo-language";
import { logAiEnquiryFromClient } from "@/lib/ai/travel-manager/enquiry-client";
import { mainMenuReplies } from "@/lib/ai/travel-manager/conversation-engine";
import {
  buildInstantWelcomeMessage,
  getNativeLanguageOption,
  getSpeechRecognitionLang,
  NATIVE_LANGUAGE_OPTIONS,
} from "@/lib/ai/travel-manager/native-languages";
import { formatChatUserMessage } from "@/types/ai-enquiry";
import {
  sanitizeClientContext,
  sanitizeTravelManagerState,
} from "@/lib/ai/travel-manager/api-payload";
import { useAiTravelContext, getLocalAiPreferences, saveLocalAiPreferences } from "@/hooks/use-ai-travel-context";
import { useTravelCheckout } from "@/hooks/use-travel-checkout";
import {
  postPaymentPath,
  postPaymentSuccessMessage,
} from "@/lib/bookings/post-payment-navigation";
import { PaymentPlanSelector } from "@/components/customer/payment-plan-selector";
import {
  calculatePayNowAmount,
  type PaymentPlan,
} from "@/lib/payments/booking-payment";
import { preferredLanguageToLocale } from "@/lib/ai/travel-manager/geo-language";
import { formatCurrency, localizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Hotel, Locale, Vehicle } from "@/types";
import type {
  CustomPackageQuote,
  QuickReply,
  TravelManagerState,
  UserLocationInfo,
} from "@/types/travel-manager";
import type { TierPackageQuote } from "@/lib/ai/travel-manager/package-tier-builder";
import { RatingStars } from "@/components/customer/rating-stars";
import { VehiclePricingPanel } from "@/components/vehicles/vehicle-pricing-panel";
import {
  estimateLuggageCapacity,
  getEffectivePricePerKm,
  vehicleFitsGuests,
} from "@/lib/vehicles/capacity";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AiChatDatePicker } from "@/components/ai/ai-chat-date-picker";
import { formatDisplayDate } from "@/lib/ai/travel-manager/parse-user-input";

interface ChatEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface TravelManagerPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getInitialAiLocale(): Locale {
  if (typeof window === "undefined") return "hi";
  const saved = getLocalAiPreferences()?.preferredLanguage;
  return saved ? preferredLanguageToLocale(saved) : "hi";
}

export function TravelManagerPopup({ open, onOpenChange }: TravelManagerPopupProps) {
  const router = useRouter();
  const [aiLocale, setAiLocale] = useState<Locale>(getInitialAiLocale);
  const [nativeLanguage, setNativeLanguage] = useState<string>(
    () => getLocalAiPreferences()?.nativeLanguage ?? ""
  );
  const { user } = useAuth();
  const { buildClientContext, saveLanguagePreference, saveNativeLanguagePreference } =
    useAiTravelContext(user?.id);
  const { completeBooking, completeCatalogBooking, paying } = useTravelCheckout();
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [tmState, setTmState] = useState<TravelManagerState | undefined>();
  const [userLocation, setUserLocation] = useState<UserLocationInfo | undefined>();
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [packageQuote, setPackageQuote] = useState<CustomPackageQuote | undefined>();
  const [packageTiers, setPackageTiers] = useState<TierPackageQuote[]>([]);
  const [detailsTier, setDetailsTier] = useState<TierPackageQuote | null>(null);
  const [detailsVehicle, setDetailsVehicle] = useState<Vehicle | null>(null);
  const [selectedBookingVehicle, setSelectedBookingVehicle] = useState<Vehicle | null>(null);
  const [selectedBookingHotel, setSelectedBookingHotel] = useState<Hotel | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookingForm, setBookingForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    travelDate: "",
    pickupCity: "Delhi",
    guests: 2,
    specialRequest: "",
  });
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("advance");
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const userInteractedRef = useRef(false);
  const tmStateRef = useRef<TravelManagerState | undefined>(undefined);

  useEffect(() => {
    tmStateRef.current = tmState;
  }, [tmState]);

  const postManager = useCallback(
    async (payload: {
      message: string;
      locale: Locale;
      forceLocale?: Locale;
      state?: TravelManagerState;
    }) => {
      const context = buildClientContext();
      const state = sanitizeTravelManagerState(payload.state ?? tmStateRef.current);

      const res = await fetch("/api/ai/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          message: payload.message,
          locale: payload.locale,
          forceLocale: payload.forceLocale ?? payload.locale,
          ...(state ? { state } : {}),
          ...(context ? { context: sanitizeClientContext(context) } : {}),
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        throw new Error(json.error ?? `Request failed (${res.status})`);
      }

      return json.data;
    },
    [buildClientContext]
  );

  const initChat = useCallback(
    async (forceLocale?: "en" | "hi", options?: { background?: boolean }) => {
      const background = options?.background ?? false;
      if (!background) setLoading(true);
      try {
        const activeLocale = forceLocale ?? aiLocale;
        const data = await postManager({
          message: "__init__",
          locale: activeLocale,
          forceLocale: forceLocale ?? activeLocale,
        });
        const onWelcome = !tmStateRef.current || tmStateRef.current.step === "welcome";
        if (onWelcome && !userInteractedRef.current) {
          setMessages([{ id: "1", role: "assistant", content: data.reply }]);
        }
        setQuickReplies(data.quickReplies ?? []);
        setTmState(data.state);
        setUserLocation(data.location ?? data.state?.userLocation);
        if (data.locale) {
          setAiLocale(data.locale);
          saveLanguagePreference(data.locale);
        }
        setPackageQuote(undefined);
        setPackageTiers([]);
        setHotels([]);
        setVehicles([]);
      } catch {
        if (!background) {
          toast.error("Could not start AI Travel Manager");
        }
      } finally {
        if (!background) setLoading(false);
      }
    },
    [aiLocale, postManager, saveLanguagePreference]
  );

  const switchLanguage = async (newLocale: Locale) => {
    if (newLocale === aiLocale) return;
    saveLanguagePreference(newLocale);
    setAiLocale(newLocale);

    if (!tmState) return;

    setLoading(true);
    try {
      const data = await postManager({
        message: "__refresh__",
        locale: newLocale,
        forceLocale: newLocale,
        state: tmStateRef.current,
      });

      setQuickReplies(data.quickReplies ?? []);
      setTmState(data.state);
      setPackageQuote(data.packageQuote);
      setPackageTiers(data.state?.step === "package_tiers" ? (data.packageTiers ?? []) : []);
      setHotels(data.hotels ?? []);
      setVehicles(data.vehicles ?? []);
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          content: data.reply,
        };
        return updated;
      });
    } catch {
      toast.error(newLocale === "hi" ? "भाषा बदलने में त्रुटि" : "Could not switch language");
    } finally {
      setLoading(false);
    }
  };

  const switchNativeLanguage = (code: string | null) => {
    const nextCode = !code || code === "none" ? "" : code;
    setNativeLanguage(nextCode);
    saveNativeLanguagePreference(nextCode);

    if (!tmState || tmState.step === "welcome") {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: buildInstantWelcomeMessage(aiLocale, nextCode),
        },
      ]);
    }
  };

  useEffect(() => {
    if (!open) {
      userInteractedRef.current = false;
      tmStateRef.current = undefined;
      setMessages([]);
      setInput("");
      setLoading(false);
      setListening(false);
      setTmState(undefined);
      setUserLocation(undefined);
      setQuickReplies([]);
      setPackageQuote(undefined);
      setPackageTiers([]);
      setDetailsTier(null);
      setDetailsVehicle(null);
      setSelectedBookingVehicle(null);
      setSelectedBookingHotel(null);
      setHotels([]);
      setVehicles([]);
    }
  }, [open]);

  useEffect(() => {
    if (open && messages.length === 0) {
      const prefs = getLocalAiPreferences();
      const locale = getInitialAiLocale();
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: buildInstantWelcomeMessage(locale, prefs?.nativeLanguage),
        },
      ]);
      setQuickReplies(mainMenuReplies(locale));
      void initChat(undefined, { background: true });
    }
  }, [open, messages.length, initChat]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, packageQuote, packageTiers, hotels, vehicles]);

  const handleQuickReply = (qr: QuickReply) => {
    if (qr.value.startsWith("__link:")) {
      router.push(qr.value.replace("__link:", ""));
      onOpenChange(false);
      return;
    }
    void sendMessage(qr.value, { displayText: qr.label });
  };

  const applyResponse = (data: {
    reply: string;
    state?: TravelManagerState;
    quickReplies?: QuickReply[];
    packageQuote?: CustomPackageQuote;
    packageTiers?: TierPackageQuote[];
    hotels?: Hotel[];
    vehicles?: Vehicle[];
  }) => {
    setTmState(data.state);
    setQuickReplies(data.quickReplies ?? []);
    setPackageQuote((prev) => data.packageQuote ?? prev);
    setPackageTiers(data.state?.step === "package_tiers" ? (data.packageTiers ?? []) : []);
    setHotels((prev) => (data.hotels?.length ? data.hotels : prev));
    setVehicles((prev) => (data.vehicles?.length ? data.vehicles : prev));
    if (data.state) {
      setBookingForm((f) => ({
        ...f,
        ...(data.state?.guests ? { guests: data.state.guests } : {}),
        ...(data.state?.pickupCity ? { pickupCity: data.state.pickupCity } : {}),
        ...(data.state?.customerName ? { name: data.state.customerName } : {}),
        ...(data.state?.customerEmail ? { email: data.state.customerEmail } : {}),
        ...(data.state?.customerPhone ? { phone: data.state.customerPhone } : {}),
        ...(data.state?.travelDate ? { travelDate: data.state.travelDate } : {}),
        ...(data.state?.specialRequest ? { specialRequest: data.state.specialRequest } : {}),
      }));
    }
  };

  const sendMessage = async (
    text: string,
    options?: { silent?: boolean; displayText?: string }
  ) => {
    if (!text.trim() || loading) return;

    userInteractedRef.current = true;
    const userDisplay = options?.displayText?.trim() || formatChatUserMessage(text);

    setMessages((prev) =>
      options?.silent
        ? prev
        : [...prev, { id: Date.now().toString(), role: "user", content: userDisplay }]
    );
    setInput("");
    const previousQuickReplies = quickReplies;
    setQuickReplies([]);
    setLoading(true);

    try {
      const data = await postManager({
        message: text,
        locale: aiLocale,
        forceLocale: aiLocale,
        state: tmStateRef.current,
      });

      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: data.reply },
      ]);
      applyResponse(data);

      if (
        !data.enquiryLogged &&
        text !== "__init__" &&
        text !== "__refresh__"
      ) {
        const selectedTier = data.packageTiers?.find(
          (t: { tierId: string }) => t.tierId === data.state?.selectedTierId
        );
        void logAiEnquiryFromClient({
          userMessage: text,
          aiReply: data.reply,
          locale: aiLocale,
          state: data.state,
          context: buildClientContext(),
          packagePrice: data.packageQuote?.totalAmount ?? selectedTier?.totalAmount,
          location: data.location ?? data.state?.userLocation ?? userLocation,
        });
      }

      try {
        const memoryUpdates = memoryFromState(data.state ?? {}, aiLocale);
        saveLocalAiPreferences(
          mergePreferences(getLocalAiPreferences() ?? undefined, memoryUpdates)
        );
      } catch (storageError) {
        console.warn("Could not save AI preferences locally:", storageError);
      }
    } catch (error) {
      console.error("AI Travel Manager request failed:", error);
      setQuickReplies(
        previousQuickReplies.length > 0
          ? previousQuickReplies
          : tmStateRef.current?.step === "welcome" || !tmStateRef.current
            ? mainMenuReplies(aiLocale)
            : []
      );
      toast.error(aiLocale === "hi" ? "त्रुटि, पुनः प्रयास करें" : "Error, please try again");
    } finally {
      setLoading(false);
    }
  };

  const resolveSelectedHotel = useCallback(
    () => hotels.find((h) => h.id === tmState?.selectedHotelId) ?? selectedBookingHotel ?? undefined,
    [hotels, tmState?.selectedHotelId, selectedBookingHotel]
  );

  const resolveSelectedVehicle = useCallback(
    () =>
      vehicles.find((v) => v.id === tmState?.selectedVehicleId) ??
      selectedBookingVehicle ??
      undefined,
    [vehicles, tmState?.selectedVehicleId, selectedBookingVehicle]
  );

  const computeCheckoutAmount = useCallback(
    (
      quote?: CustomPackageQuote,
      hotel?: Hotel,
      vehicle?: Vehicle
    ): number => {
      if (quote?.totalAmount && quote.totalAmount > 0) return quote.totalAmount;
      return (hotel?.priceFrom ?? 0) + (vehicle?.pricePerDay ?? 0);
    },
    []
  );

  const handlePay = async () => {
    if (!bookingForm.name || !bookingForm.email || !bookingForm.phone || !bookingForm.travelDate) {
      toast.error(aiLocale === "hi" ? "सभी विवरण भरें" : "Please fill all details");
      return;
    }

    const email = bookingForm.email.trim();
    const phoneDigits = bookingForm.phone.replace(/\D/g, "").slice(-10);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error(aiLocale === "hi" ? "सही ईमेल दर्ज करें" : "Please enter a valid email");
      return;
    }
    if (!/^\d{10}$/.test(phoneDigits)) {
      toast.error(
        aiLocale === "hi"
          ? "फ़ोन में 10 अंकों का मोबाइल नंबर दर्ज करें (ईमेल नहीं)"
          : "Enter a 10-digit mobile number in the phone field (not email)"
      );
      return;
    }

    const hotel = resolveSelectedHotel();
    const vehicle = resolveSelectedVehicle();
    const checkoutAmount = computeCheckoutAmount(packageQuote, hotel, vehicle);

    if (!checkoutAmount || checkoutAmount <= 0) {
      toast.error(
        packageQuote
          ? aiLocale === "hi"
            ? "पैकेज कीमत लोड नहीं हुई — कृपया पैकेज फिर से चुनें"
            : "Package price not loaded — please select your package again"
          : vehicle
            ? aiLocale === "hi"
              ? "वाहन की कीमत लोड नहीं हुई — कृपया वाहन फिर से चुनें"
              : "Vehicle price not loaded — please select your vehicle again"
            : aiLocale === "hi"
              ? "बुकिंग कीमत लोड नहीं हुई — कृपया होटल या वाहन फिर से चुनें"
              : "Booking price not loaded — please select hotel or vehicle again"
      );
      return;
    }

    try {
      let paymentResult;

      if (packageQuote?.totalAmount) {
        paymentResult = await completeBooking({
          ...bookingForm,
          customerName: bookingForm.name,
          customerEmail: email,
          customerPhone: phoneDigits,
          packageQuote,
          hotel,
          vehicle,
          userId: user?.id,
          paymentPlan,
        });
      } else if (vehicle && !hotel) {
        const title = localizedText(vehicle.name, aiLocale);
        paymentResult = await completeCatalogBooking({
          customerName: bookingForm.name.trim(),
          customerEmail: email,
          customerPhone: phoneDigits,
          serviceType: "vehicle",
          serviceId: vehicle.id,
          serviceName: { en: title, hi: vehicle.name.hi },
          startDate: bookingForm.travelDate,
          guests: bookingForm.guests,
          amount: checkoutAmount,
          paymentPlan,
          userId: user?.id,
          notes: bookingForm.specialRequest || bookingForm.pickupCity
            ? `Pickup: ${bookingForm.pickupCity}${bookingForm.specialRequest ? ` · ${bookingForm.specialRequest}` : ""}`
            : undefined,
        });
      } else if (hotel && !vehicle) {
        const title = localizedText(hotel.name, aiLocale);
        paymentResult = await completeCatalogBooking({
          customerName: bookingForm.name.trim(),
          customerEmail: email,
          customerPhone: phoneDigits,
          serviceType: "hotel",
          serviceId: hotel.id,
          serviceName: { en: title, hi: hotel.name.hi },
          startDate: bookingForm.travelDate,
          guests: bookingForm.guests,
          amount: checkoutAmount,
          paymentPlan,
          userId: user?.id,
          notes: bookingForm.specialRequest || undefined,
        });
      } else {
        paymentResult = await completeBooking({
          ...bookingForm,
          customerName: bookingForm.name,
          customerEmail: email,
          customerPhone: phoneDigits,
          packageQuote,
          hotel,
          vehicle,
          userId: user?.id,
          paymentPlan,
        });
      }

      toast.success(
        postPaymentSuccessMessage(paymentResult.booking.bookingNumber, Boolean(user))
      );
      router.push(postPaymentPath(Boolean(user)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
    }
  };

  const toggleVoice = () => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error(aiLocale === "hi" ? "वॉइस समर्थित नहीं" : "Voice not supported in this browser");
      return;
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = getSpeechRecognitionLang(aiLocale, nativeLanguage);
    rec.interimResults = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript?.trim() ?? "";
      setInput(transcript);
      if (transcript.length >= 2) {
        void sendMessage(transcript);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const showPackageQuote =
    packageQuote &&
    (tmState?.step === "package_review" || tmState?.step === "customize");

  const showTierGrid = packageTiers.length > 0 && tmState?.step === "package_tiers";

  const showBookingForm =
    tmState?.step === "booking_form" || tmState?.step === "payment";

  const selectedHotel = resolveSelectedHotel();
  const selectedVehicle = resolveSelectedVehicle();
  const checkoutAmount = computeCheckoutAmount(packageQuote, selectedHotel, selectedVehicle);

  useEffect(() => {
    if (!showBookingForm || !tmState) return;
    setBookingForm((f) => ({
      ...f,
      pickupCity: tmState.pickupCity ?? f.pickupCity,
      guests: tmState.guests ?? f.guests,
    }));
  }, [showBookingForm, tmState?.pickupCity, tmState?.guests, tmState?.step]);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[min(92vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-primary to-sky-600 px-4 py-3 text-left text-white">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex min-w-0 items-center gap-2 text-base font-semibold text-white">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/95 p-1">
                <AiAssistantIcon size={24} className="h-6 w-6" />
              </span>
              <span className="truncate">Safar Sathi AI</span>
            </DialogTitle>
            <div className="flex shrink-0 items-center gap-1">
              <Select value={nativeLanguage || "none"} onValueChange={switchNativeLanguage}>
                <SelectTrigger
                  className="h-8 w-[min(7.5rem,28vw)] border-white/25 bg-white/20 text-xs text-white shadow-none [&_svg]:text-white"
                  size="sm"
                  aria-label={aiLocale === "hi" ? "मातृभाषा" : "Native language"}
                >
                  <SelectValue>
                    {nativeLanguage
                      ? getNativeLanguageOption(nativeLanguage)?.nameNative ?? nativeLanguage
                      : aiLocale === "hi"
                        ? "🗣️ भाषा"
                        : "🗣️ Language"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="none">
                    {aiLocale === "hi" ? "हिंदी / English" : "Hindi / English only"}
                  </SelectItem>
                  {NATIVE_LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.nameNative} · {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div
                className="flex items-center gap-0.5 rounded-full border border-white/25 bg-white/20 px-1 py-0.5 text-xs backdrop-blur-sm"
                role="group"
                aria-label="Reply language"
              >
                <span className="hidden px-1 opacity-90 sm:inline">🌐</span>
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-2 py-1 transition-colors",
                    aiLocale === "hi" ? "bg-white text-primary font-semibold shadow-sm" : "text-white hover:bg-white/15"
                  )}
                  onClick={() => void switchLanguage("hi")}
                >
                  हिंदी
                </button>
                <button
                  type="button"
                  className={cn(
                    "rounded-full px-2 py-1 transition-colors",
                    aiLocale === "en" ? "bg-white text-primary font-semibold shadow-sm" : "text-white hover:bg-white/15"
                  )}
                  onClick={() => void switchLanguage("en")}
                >
                  English
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-white/80">
            {userLocation?.city
              ? aiLocale === "hi"
                ? `📍 ${userLocation.city}${userLocation.state ? `, ${userLocation.state}` : ""} · लाइव कीमतें · Razorpay`
                : `📍 ${userLocation.city}${userLocation.state ? `, ${userLocation.state}` : ""} · Live prices · Razorpay`
              : aiLocale === "hi"
                ? "लाइव कीमतें · हिंदी डिफ़ॉल्ट · Razorpay"
                : "Live prices · Hindi default · Razorpay"}
          </p>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
          <div className="space-y-3 pb-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "max-w-[90%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {msg.content}
              </div>
            ))}

            {showTierGrid && (
              <div className="grid gap-3 sm:grid-cols-2">
                {packageTiers.map((tier) => (
                  <TierPackageCard
                    key={tier.tierId}
                    tier={tier}
                    locale={aiLocale}
                    onSelect={() => void sendMessage(`select_tier:${tier.tierId}`)}
                    onCustomize={() => void sendMessage(`customize_tier:${tier.tierId}`)}
                    onFullDetails={() => setDetailsTier(tier)}
                  />
                ))}
              </div>
            )}

            {showPackageQuote && packageQuote && (
              <PackageQuoteCard
                quote={packageQuote}
                locale={aiLocale}
                showBook={tmState?.step === "package_review"}
                onBook={() => void sendMessage("book_package")}
              />
            )}

            {hotels.length > 0 && (
              <div className="space-y-2">
                {hotels.map((hotel) => (
                  <HotelCardMini
                    key={hotel.id}
                    hotel={hotel}
                    locale={aiLocale}
                    onBook={() => {
                      setSelectedBookingHotel(hotel);
                      void sendMessage(`book_hotel:${hotel.id}`);
                    }}
                  />
                ))}
              </div>
            )}

            {vehicles.length > 0 && (
              <div className="space-y-2">
                {vehicles.map((vehicle) => (
                  <VehicleCardMini
                    key={vehicle.id}
                    vehicle={vehicle}
                    locale={aiLocale}
                    requestedGuests={tmState?.guests}
                    onDetails={() => setDetailsVehicle(vehicle)}
                    onBook={() => {
                      setSelectedBookingVehicle(vehicle);
                      void sendMessage(`book_vehicle:${vehicle.id}`);
                    }}
                  />
                ))}
              </div>
            )}

            {showBookingForm && (
              <div className="rounded-xl border bg-card p-3 space-y-3">
                <p className="text-sm font-semibold">
                  {aiLocale === "hi" ? "बुकिंग विवरण" : "Booking Details"}
                </p>
                {(selectedVehicle || selectedHotel || packageQuote) && (
                  <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs">
                    {packageQuote && (
                      <p className="font-medium text-primary">
                        📦 {packageQuote.title} · {formatCurrency(packageQuote.totalAmount, aiLocale)}
                      </p>
                    )}
                    {selectedVehicle && (
                      <p className="font-medium text-primary">
                        🚗 {localizedText(selectedVehicle.name, aiLocale)} ·{" "}
                        {formatCurrency(selectedVehicle.pricePerDay, aiLocale)}
                        {aiLocale === "hi" ? "/दिन" : "/day"}
                      </p>
                    )}
                    {selectedHotel && (
                      <p className="font-medium text-primary">
                        🏨 {localizedText(selectedHotel.name, aiLocale)} ·{" "}
                        {formatCurrency(selectedHotel.priceFrom, aiLocale)}
                        {aiLocale === "hi" ? "/रात" : "/night"}
                      </p>
                    )}
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">{aiLocale === "hi" ? "नाम" : "Name"}</Label>
                    <Input
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm((f) => ({ ...f, name: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{aiLocale === "hi" ? "फ़ोन" : "Phone"}</Label>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      placeholder={aiLocale === "hi" ? "10 अंकों का मोबाइल" : "10-digit mobile"}
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm((f) => ({ ...f, phone: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Email</Label>
                    <Input
                      type="email"
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm((f) => ({ ...f, email: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{aiLocale === "hi" ? "यात्रा तिथि" : "Travel Date"}</Label>
                    <Input
                      type="date"
                      value={bookingForm.travelDate}
                      onChange={(e) => setBookingForm((f) => ({ ...f, travelDate: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{aiLocale === "hi" ? "मेहमान" : "Guests"}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={bookingForm.guests}
                      onChange={(e) =>
                        setBookingForm((f) => ({ ...f, guests: Number(e.target.value) }))
                      }
                      className="h-9"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">{aiLocale === "hi" ? "पिकअप शहर" : "Pickup City"}</Label>
                    <Input
                      value={bookingForm.pickupCity}
                      onChange={(e) => setBookingForm((f) => ({ ...f, pickupCity: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                </div>
                {checkoutAmount > 0 && (
                  <PaymentPlanSelector
                    totalAmount={checkoutAmount}
                    value={paymentPlan}
                    onChange={setPaymentPlan}
                    locale={aiLocale}
                  />
                )}
                <Button className="w-full" disabled={paying} onClick={() => void handlePay()}>
                  {paying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {aiLocale === "hi" ? "Pay Now — Razorpay 💳" : "Pay Now — Razorpay 💳"}
                  {checkoutAmount > 0 &&
                    ` · ${formatCurrency(
                      calculatePayNowAmount(checkoutAmount, paymentPlan),
                      aiLocale
                    )}`}
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {aiLocale === "hi" ? "सोच रहा हूं…" : "Thinking…"}
              </div>
            )}

            {tmState?.step === "hotel_dates" && !loading && (
              <AiChatDatePicker
                mode={tmState.travelDate ? "check_out" : "check_in"}
                locale={aiLocale}
                checkInDate={tmState.travelDate}
                disabled={loading}
                onSelect={(iso) => {
                  void sendMessage(iso, {
                    displayText: formatDisplayDate(iso, aiLocale),
                  });
                }}
              />
            )}

            <div ref={scrollRef} />
          </div>
        </div>

        {quickReplies.length > 0 && (
          <div
            className={cn(
              "shrink-0 border-t bg-background px-3 py-2 max-h-[40vh] overflow-y-auto",
              quickReplies.some((q) => q.variant === "card")
                ? "grid grid-cols-2 gap-2 sm:grid-cols-3"
                : "flex flex-wrap gap-2"
            )}
          >
            {quickReplies.map((qr) => (
              <Button
                key={qr.id}
                variant={qr.variant === "card" ? "secondary" : "outline"}
                size={qr.variant === "card" ? "default" : "sm"}
                className={cn(
                  qr.variant === "card"
                    ? "h-auto min-h-[3.5rem] flex-col gap-1 py-3 text-xs font-semibold whitespace-normal"
                    : "h-8 text-xs"
                )}
                disabled={loading}
                onClick={() => handleQuickReply(qr)}
              >
                {qr.label}
              </Button>
            ))}
          </div>
        )}

        <form
          className="flex shrink-0 items-center gap-2 border-t bg-background p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
        >
          <Button
            type="button"
            variant={listening ? "default" : "outline"}
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={toggleVoice}
            aria-label="Voice input"
          >
            {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Input
            placeholder={
              nativeLanguage
                ? aiLocale === "hi"
                  ? "हिंदी, English या अपनी भाषा में पूछें…"
                  : "Ask in English, Hindi, or your native language…"
                : aiLocale === "hi"
                  ? "हिंदी या English में पूछें…"
                  : "Ask in Hindi or English…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="h-10"
          />
          <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>

      {detailsTier && (
        <TierPackageDetailsDialog
          tier={detailsTier}
          locale={aiLocale}
          open={!!detailsTier}
          onOpenChange={(open) => {
            if (!open) setDetailsTier(null);
          }}
          onSelect={() => {
            const tierId = detailsTier.tierId;
            setDetailsTier(null);
            void sendMessage(`select_tier:${tierId}`);
          }}
          onBook={() => {
            const tierId = detailsTier.tierId;
            setDetailsTier(null);
            void sendMessage(`select_tier:${tierId}`);
          }}
        />
      )}
      {detailsVehicle && (
        <VehicleDetailsDialog
          vehicle={detailsVehicle}
          locale={aiLocale}
          requestedGuests={tmState?.guests}
          open={!!detailsVehicle}
          onOpenChange={(open) => {
            if (!open) setDetailsVehicle(null);
          }}
          onBook={() => {
            const vehicleId = detailsVehicle.id;
            setSelectedBookingVehicle(detailsVehicle);
            setDetailsVehicle(null);
            void sendMessage(`book_vehicle:${vehicleId}`);
          }}
        />
      )}
    </>
  );
}

function TierPackageCard({
  tier,
  locale,
  onSelect,
  onCustomize,
  onFullDetails,
}: {
  tier: TierPackageQuote;
  locale: "en" | "hi";
  onSelect: () => void;
  onCustomize: () => void;
  onFullDetails: () => void;
}) {
  return (
    <div className="rounded-xl border-2 border-primary/20 bg-card p-3 shadow-sm">
      <p className="font-bold text-primary">{tier.tierLabel}</p>
      <p className="text-xs text-muted-foreground">
        {tier.nights} {locale === "hi" ? "रात" : "Nights"} · {tier.durationDays}{" "}
        {locale === "hi" ? "दिन" : "Days"}
      </p>
      <div className="mt-2 space-y-1 text-xs">
        {tier.hotel && (
          <p>
            🏨 {tier.hotel.name} ({tier.hotel.starRating}★)
          </p>
        )}
        {tier.vehicle && <p>🚗 {tier.vehicle.name}</p>}
        <p>🎯 {tier.includedPlaces.slice(0, 3).join(", ")}</p>
        <p>🍽 {tier.mealsLabel}</p>
      </div>
      <p className="mt-2 text-lg font-bold text-primary">
        {formatCurrency(tier.totalAmount, locale)}
      </p>
      <Button
        size="sm"
        variant="secondary"
        className="mt-2 w-full h-8 text-xs"
        onClick={onFullDetails}
      >
        {locale === "hi" ? "पूरा विवरण" : "Full Details"}
      </Button>
      <div className="mt-2 flex gap-2">
        <Button size="sm" className="flex-1 h-8 text-xs" onClick={onSelect}>
          {locale === "hi" ? "चुनें" : "Select"}
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={onCustomize}>
          {locale === "hi" ? "कस्टमाइज़" : "Customize"}
        </Button>
      </div>
    </div>
  );
}

function TierPackageDetailsDialog({
  tier,
  locale,
  open,
  onOpenChange,
  onSelect,
  onBook,
}: {
  tier: TierPackageQuote;
  locale: "en" | "hi";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: () => void;
  onBook: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tier.tierLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg bg-primary/5 p-3 space-y-1">
            <p className="font-semibold text-primary">{tier.title}</p>
            <p className="text-xs text-muted-foreground">
              {tier.durationDays} {locale === "hi" ? "दिन" : "days"} · {tier.nights}{" "}
              {locale === "hi" ? "रात" : "nights"} · {tier.guests}{" "}
              {locale === "hi" ? "मेहमान" : "guests"}
            </p>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(tier.totalAmount, locale)}
            </p>
          </div>

          {tier.hotel && (
            <div>
              <p className="font-medium mb-1">{locale === "hi" ? "🏨 होटल" : "🏨 Hotel"}</p>
              <p className="text-xs text-muted-foreground">
                {tier.hotel.name} ({tier.hotel.starRating}★) — {tier.hotel.roomType} —{" "}
                {formatCurrency(tier.hotel.total, locale)}
              </p>
            </div>
          )}

          {tier.vehicle && (
            <div>
              <p className="font-medium mb-1">{locale === "hi" ? "🚗 वाहन" : "🚗 Vehicle"}</p>
              <p className="text-xs text-muted-foreground">
                {tier.vehicle.name} — {formatCurrency(tier.vehicle.total, locale)}
              </p>
            </div>
          )}

          {tier.activities.length > 0 && (
            <div>
              <p className="font-medium mb-1">{locale === "hi" ? "🎯 गतिविधियाँ" : "🎯 Activities"}</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {tier.activities.map((a) => (
                  <li key={a.id}>
                    {a.name} — {formatCurrency(a.price, locale)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="font-medium mb-2">
              {locale === "hi" ? "📅 दिन-दर-दिन योजना" : "📅 Day-by-day itinerary"}
            </p>
            <div className="space-y-3">
              {tier.itinerary.map((day) => (
                <div key={day.day} className="rounded-lg border p-3">
                  <p className="font-semibold text-xs text-primary">
                    {locale === "hi" ? day.titleHi : day.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {locale === "hi" ? day.descriptionHi : day.description}
                  </p>
                  {day.meals && (
                    <p className="mt-1 text-[11px] text-muted-foreground">🍽 {day.meals}</p>
                  )}
                  {day.stay && day.stay !== "—" && (
                    <p className="text-[11px] text-muted-foreground">🏨 {day.stay}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="font-medium mb-1">{locale === "hi" ? "📍 पिकअप" : "📍 Pickup"}</p>
            <p className="text-xs text-muted-foreground">{tier.pickup}</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={onBook}>
              {locale === "hi" ? "बुक करें 📅" : "Book Now 📅"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={onSelect}>
              {locale === "hi" ? "चुनें" : "Select"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PackageQuoteCard({
  quote,
  locale,
  onBook,
  showBook = true,
}: {
  quote: CustomPackageQuote;
  locale: "en" | "hi";
  onBook: () => void;
  showBook?: boolean;
}) {
  return (
    <div className="rounded-xl border-2 border-primary/30 bg-card p-3 shadow-sm">
      <p className="font-semibold text-primary">{quote.title}</p>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {quote.hotel && (
          <p>
            🏨 {quote.hotel.name} ({quote.hotel.starRating}★) — {formatCurrency(quote.hotel.total, locale)}
          </p>
        )}
        {quote.vehicle && (
          <p>
            🚗 {quote.vehicle.name} — {formatCurrency(quote.vehicle.total, locale)}
            {quote.vehicle.pricePerKm ? ` · ₹${quote.vehicle.pricePerKm}/km` : ""}
          </p>
        )}
        {quote.activities.map((a) => (
          <p key={a.id}>🎯 {a.name} — {formatCurrency(a.price, locale)}</p>
        ))}
      </div>
      <p className="mt-2 text-lg font-bold text-primary">
        {formatCurrency(quote.totalAmount, locale)}
      </p>
      {showBook && (
        <Button size="sm" className="mt-2 w-full" onClick={onBook}>
          {locale === "hi" ? "Book Now 📅" : "Book Now 📅"}
        </Button>
      )}
    </div>
  );
}

function HotelCardMini({
  hotel,
  locale,
  onBook,
}: {
  hotel: Hotel;
  locale: "en" | "hi";
  onBook: () => void;
}) {
  return (
    <div className="flex gap-2 rounded-lg border bg-card p-2">
      {hotel.images[0] && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
          <Image src={hotel.images[0]} alt="" fill className="object-cover" sizes="64px" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium">{localizedText(hotel.name, locale)}</p>
        <p className="text-xs text-muted-foreground">
          {hotel.starRating}★ · {formatCurrency(hotel.priceFrom, locale)}/night
        </p>
        <Button size="sm" variant="outline" className="mt-1 h-7 text-xs" onClick={onBook}>
          Book
        </Button>
      </div>
    </div>
  );
}

function VehicleCardMini({
  vehicle,
  locale,
  requestedGuests,
  onDetails,
  onBook,
}: {
  vehicle: Vehicle;
  locale: "en" | "hi";
  requestedGuests?: number;
  onDetails: () => void;
  onBook: () => void;
}) {
  const pricePerKm = getEffectivePricePerKm(vehicle);
  const luggage = estimateLuggageCapacity(vehicle.seats);
  const fitsGroup = vehicleFitsGuests(vehicle, requestedGuests);
  const vehicleName = localizedText(vehicle.name, locale);

  return (
    <div className="rounded-xl border bg-card p-2.5 shadow-sm">
      <div className="flex gap-3">
        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-muted">
          {vehicle.images[0] ? (
            <Image
              src={vehicle.images[0]}
              alt={vehicleName}
              fill
              className="object-cover"
              sizes="72px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
              {locale === "hi" ? "कोई फोटो नहीं" : "No photo"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-1 text-sm font-semibold">{vehicleName}</p>
            <RatingStars rating={vehicle.rating} className="shrink-0 text-xs" />
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {vehicle.seats} {locale === "hi" ? "सीट" : "seats"} ·{" "}
            {formatCurrency(vehicle.pricePerDay, locale)}
            {locale === "hi" ? "/दिन" : "/day"}
            {vehicle.pricePerKm || pricePerKm
              ? ` · ${formatCurrency(pricePerKm, locale)}${locale === "hi" ? "/किमी" : "/km"}`
              : ""}
          </p>

          <p className="mt-1 text-[11px] text-muted-foreground">
            {locale === "hi"
              ? `अधिकतम ${vehicle.seats} यात्री · ~${luggage} बैग`
              : `Max ${vehicle.seats} passengers · ~${luggage} bags`}
          </p>

          {requestedGuests && requestedGuests > 0 && (
            <p
              className={cn(
                "mt-1 text-[11px] font-medium",
                fitsGroup ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              )}
            >
              {fitsGroup
                ? locale === "hi"
                  ? `✓ आपके ${requestedGuests} यात्रियों के लिए उपयुक्त`
                  : `✓ Fits your group of ${requestedGuests}`
                : locale === "hi"
                  ? `⚠ ${requestedGuests} यात्रियों के लिए छोटा — बड़ा वाहन चुनें`
                  : `⚠ Too small for ${requestedGuests} — choose a larger vehicle`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex gap-2">
        <Button size="sm" variant="secondary" className="h-8 flex-1 text-xs" onClick={onDetails}>
          {locale === "hi" ? "पूरा विवरण" : "Full Details"}
        </Button>
        <Button size="sm" className="h-8 flex-1 text-xs" onClick={onBook}>
          {locale === "hi" ? "बुक करें" : "Book"}
        </Button>
      </div>
    </div>
  );
}

function VehicleDetailsDialog({
  vehicle,
  locale,
  requestedGuests,
  open,
  onOpenChange,
  onBook,
}: {
  vehicle: Vehicle;
  locale: "en" | "hi";
  requestedGuests?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBook: () => void;
}) {
  const pricePerKm = getEffectivePricePerKm(vehicle);
  const luggage = estimateLuggageCapacity(vehicle.seats);
  const fitsGroup = vehicleFitsGuests(vehicle, requestedGuests);
  const vehicleName = localizedText(vehicle.name, locale);
  const description = localizedText(vehicle.description, locale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {vehicle.images[0] ? (
            <Image
              src={vehicle.images[0]}
              alt={vehicleName}
              fill
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
            />
          ) : null}
        </div>

        <div className="space-y-4 p-4 pt-3">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="text-lg leading-tight">{vehicleName}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <RatingStars rating={vehicle.rating} reviewCount={vehicle.reviewCount} />
              {vehicle.brand && <Badge variant="outline">{vehicle.brand}</Badge>}
              <Badge variant="secondary" className="capitalize">
                {vehicle.category ?? vehicle.type.replace("_", " ")}
              </Badge>
            </div>
          </DialogHeader>

          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {vehicle.location}
          </p>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              <Users className="mr-1 h-3 w-3" />
              {locale === "hi"
                ? `अधिकतम ${vehicle.seats} यात्री`
                : `Max ${vehicle.seats} passengers`}
            </Badge>
            <Badge variant="secondary">
              {locale === "hi" ? `~${luggage} बैग` : `~${luggage} bags`}
            </Badge>
            <Badge variant="secondary">
              <Fuel className="mr-1 h-3 w-3" />
              {vehicle.fuelType}
            </Badge>
            {vehicle.driverIncluded && (
              <Badge>{locale === "hi" ? "ड्राइवर शामिल" : "Driver Included"}</Badge>
            )}
          </div>

          {requestedGuests && requestedGuests > 0 && (
            <p
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                fitsGroup
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              )}
            >
              {fitsGroup
                ? locale === "hi"
                  ? `यह वाहन आपके ${requestedGuests} यात्रियों के लिए उपयुक्त है।`
                  : `This vehicle fits your group of ${requestedGuests} passengers.`
                : locale === "hi"
                  ? `यह वाहन ${requestedGuests} यात्रियों के लिए छोटा है। कृपया ${requestedGuests} या अधिक सीट वाला वाहन चुनें।`
                  : `This vehicle is too small for ${requestedGuests} passengers. Please choose one with ${requestedGuests}+ seats.`}
            </p>
          )}

          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}

          {vehicle.features.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold">
                {locale === "hi" ? "सुविधाएँ" : "Features"}
              </p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {vehicle.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <VehiclePricingPanel vehicle={vehicle} locale={locale} />

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={onBook}>
              {locale === "hi" ? "अभी बुक करें" : "Book Now"}
            </Button>
            <Link
              href={`/vehicles/${vehicle.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }), "flex-1 justify-center")}
            >
              {locale === "hi" ? "वेबसाइट पर देखें" : "View on website"}
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Web Speech API types
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
