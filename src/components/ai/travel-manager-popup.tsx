"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Mic, MicOff, Send, X } from "lucide-react";
import { AiAssistantIcon } from "@/components/icons/ai-assistant-icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { useAiTravelContext, getLocalAiPreferences, saveLocalAiPreferences } from "@/hooks/use-ai-travel-context";
import { useTravelCheckout } from "@/hooks/use-travel-checkout";
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
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const { completeBooking, paying } = useTravelCheckout();
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

  const initChat = useCallback(
    async (forceLocale?: "en" | "hi", options?: { background?: boolean }) => {
      const background = options?.background ?? false;
      if (!background) setLoading(true);
      try {
        const activeLocale = forceLocale ?? aiLocale;
        const res = await fetch("/api/ai/manager", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "__init__",
            locale: activeLocale,
            forceLocale: forceLocale ?? activeLocale,
            context: buildClientContext(),
          }),
        });
        const json = await res.json();
        if (json.success) {
          const onWelcome = !tmState || tmState.step === "welcome";
          if (onWelcome) {
            setMessages([{ id: "1", role: "assistant", content: json.data.reply }]);
          }
          setQuickReplies(json.data.quickReplies ?? []);
          setTmState(json.data.state);
          setUserLocation(json.data.location ?? json.data.state?.userLocation);
          if (json.data.locale) {
            setAiLocale(json.data.locale);
            saveLanguagePreference(json.data.locale);
          }
          setPackageQuote(undefined);
          setPackageTiers([]);
          setHotels([]);
          setVehicles([]);
        }
      } catch {
        if (!background) {
          toast.error("Could not start AI Travel Manager");
        }
      } finally {
        if (!background) setLoading(false);
      }
    },
    [aiLocale, buildClientContext, saveLanguagePreference, tmState]
  );

  const switchLanguage = async (newLocale: Locale) => {
    if (newLocale === aiLocale) return;
    saveLanguagePreference(newLocale);
    setAiLocale(newLocale);

    if (!tmState) return;

    setLoading(true);
    try {
      const res = await fetch("/api/ai/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "__refresh__",
          locale: newLocale,
          forceLocale: newLocale,
          state: tmState,
          context: buildClientContext(),
        }),
      });
      const json = await res.json();
      if (!json.success) return;

      const data = json.data;
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
    void sendMessage(qr.value);
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
    setHotels(data.hotels ?? []);
    setVehicles(data.vehicles ?? []);
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

  const sendMessage = async (text: string, options?: { silent?: boolean }) => {
    if (!text.trim() || loading) return;

    setMessages((prev) =>
      options?.silent
        ? prev
        : [...prev, { id: Date.now().toString(), role: "user", content: text }]
    );
    setInput("");
    setQuickReplies([]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          locale: aiLocale,
          forceLocale: aiLocale,
          state: tmState,
          context: buildClientContext(),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const data = json.data;
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

      const memoryUpdates = memoryFromState(data.state ?? {}, aiLocale);
      saveLocalAiPreferences(
        mergePreferences(getLocalAiPreferences() ?? undefined, memoryUpdates)
      );
    } catch {
      toast.error(aiLocale === "hi" ? "त्रुटि, पुनः प्रयास करें" : "Error, please try again");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!bookingForm.name || !bookingForm.email || !bookingForm.phone || !bookingForm.travelDate) {
      toast.error(aiLocale === "hi" ? "सभी विवरण भरें" : "Please fill all details");
      return;
    }

    const checkoutAmount =
      packageQuote?.totalAmount ??
      (hotels.find((h) => h.id === tmState?.selectedHotelId)?.priceFrom ?? 0) +
        (vehicles.find((v) => v.id === tmState?.selectedVehicleId)?.pricePerDay ?? 0);

    if (!checkoutAmount || checkoutAmount <= 0) {
      toast.error(
        aiLocale === "hi"
          ? "पैकेज कीमत लोड नहीं हुई — कृपया पैकेज फिर से चुनें"
          : "Package price not loaded — please select your package again"
      );
      return;
    }

    try {
      await completeBooking({
        ...bookingForm,
        customerName: bookingForm.name,
        customerEmail: bookingForm.email,
        customerPhone: bookingForm.phone,
        packageQuote,
        hotel: hotels.find((h) => h.id === tmState?.selectedHotelId),
        vehicle: vehicles.find((v) => v.id === tmState?.selectedVehicleId),
        userId: user?.id,
        paymentPlan,
      });
      router.push("/my-bookings");
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
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      setInput(transcript);
      void sendMessage(transcript);
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

  const checkoutAmount =
    packageQuote?.totalAmount ??
    (hotels.find((h) => h.id === tmState?.selectedHotelId)?.priceFrom ?? 0) +
      (vehicles.find((v) => v.id === tmState?.selectedVehicleId)?.pricePerDay ?? 0);

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
                    onBook={() => void sendMessage(`book_hotel:${hotel.id}`)}
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
                    onBook={() => void sendMessage(`book_vehicle:${vehicle.id}`)}
                  />
                ))}
              </div>
            )}

            {showBookingForm && (
              <div className="rounded-xl border bg-card p-3 space-y-3">
                <p className="text-sm font-semibold">
                  {aiLocale === "hi" ? "बुकिंग विवरण" : "Booking Details"}
                </p>
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
  onBook,
}: {
  vehicle: Vehicle;
  locale: "en" | "hi";
  onBook: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
      <div>
        <p className="text-sm font-medium">{localizedText(vehicle.name, locale)}</p>
        <p className="text-xs text-muted-foreground">
          {vehicle.seats} seats · {formatCurrency(vehicle.pricePerDay, locale)}/day
          {vehicle.pricePerKm ? ` · ₹${vehicle.pricePerKm}/km` : ""}
        </p>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onBook}>
        Book
      </Button>
    </div>
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
