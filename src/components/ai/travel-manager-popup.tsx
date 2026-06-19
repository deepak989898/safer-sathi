"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Mic, MicOff, Send, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/auth-context";
import { useTravelCheckout } from "@/hooks/use-travel-checkout";
import { useAppStore } from "@/store/app-store";
import { formatCurrency, localizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Hotel, Vehicle } from "@/types";
import type {
  CustomPackageQuote,
  QuickReply,
  TravelManagerState,
} from "@/types/travel-manager";
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

export function TravelManagerPopup({ open, onOpenChange }: TravelManagerPopupProps) {
  const { locale } = useAppStore();
  const { user } = useAuth();
  const { completeBooking, paying } = useTravelCheckout();
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [tmState, setTmState] = useState<TravelManagerState | undefined>();
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [packageQuote, setPackageQuote] = useState<CustomPackageQuote | undefined>();
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const initChat = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "__init__", locale }),
      });
      const json = await res.json();
      if (json.success) {
        setMessages([{ id: "1", role: "assistant", content: json.data.reply }]);
        setQuickReplies(json.data.quickReplies ?? []);
        setTmState(json.data.state);
        setPackageQuote(undefined);
        setHotels([]);
        setVehicles([]);
      }
    } catch {
      toast.error("Could not start AI Travel Manager");
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (open && messages.length === 0) {
      void initChat();
    }
  }, [open, messages.length, initChat]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, packageQuote, hotels, vehicles]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: text }]);
    setInput("");
    setQuickReplies([]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, locale, state: tmState }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const data = json.data;
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: data.reply },
      ]);
      setTmState(data.state);
      setQuickReplies(data.quickReplies ?? []);
      setPackageQuote(data.packageQuote);
      setHotels(data.hotels ?? []);
      setVehicles(data.vehicles ?? []);

      if (data.state?.guests) {
        setBookingForm((f) => ({ ...f, guests: data.state.guests }));
      }
    } catch {
      toast.error(locale === "hi" ? "त्रुटि, पुनः प्रयास करें" : "Error, please try again");
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!bookingForm.name || !bookingForm.email || !bookingForm.phone || !bookingForm.travelDate) {
      toast.error(locale === "hi" ? "सभी विवरण भरें" : "Please fill all details");
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
      });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content:
            locale === "hi"
              ? "🎉 बुकिंग पुष्टि हो गई! ईमेल, SMS और WhatsApp पर पुष्टि भेज दी गई है।"
              : "🎉 Booking confirmed! Confirmation sent via Email, SMS & WhatsApp.",
        },
      ]);
      setQuickReplies([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment failed");
    }
  };

  const toggleVoice = () => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error(locale === "hi" ? "वॉइस समर्थित नहीं" : "Voice not supported in this browser");
      return;
    }
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = locale === "hi" ? "hi-IN" : "en-IN";
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

  const showBookingForm =
    tmState?.step === "booking_form" ||
    tmState?.step === "payment" ||
    packageQuote !== undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b bg-gradient-to-r from-primary to-sky-600 px-4 py-3 text-left text-white">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white">
              <Sparkles className="h-5 w-5" />
              Safar Sathi AI Travel Manager
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-white/80">
            {locale === "hi" ? "लाइव कीमतें · हिंदी/English · Razorpay" : "Live prices · EN/HI · Razorpay"}
          </p>
        </DialogHeader>

        <ScrollArea className="flex-1 px-3 py-3">
          <div className="space-y-3">
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

            {packageQuote && (
              <PackageQuoteCard
                quote={packageQuote}
                locale={locale}
                onBook={() => void sendMessage("book_package")}
              />
            )}

            {hotels.length > 0 && (
              <div className="space-y-2">
                {hotels.map((hotel) => (
                  <HotelCardMini
                    key={hotel.id}
                    hotel={hotel}
                    locale={locale}
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
                    locale={locale}
                    onBook={() => void sendMessage(`book_vehicle:${vehicle.id}`)}
                  />
                ))}
              </div>
            )}

            {showBookingForm && (
              <div className="rounded-xl border bg-card p-3 space-y-3">
                <p className="text-sm font-semibold">
                  {locale === "hi" ? "बुकिंग विवरण" : "Booking Details"}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">{locale === "hi" ? "नाम" : "Name"}</Label>
                    <Input
                      value={bookingForm.name}
                      onChange={(e) => setBookingForm((f) => ({ ...f, name: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{locale === "hi" ? "फ़ोन" : "Phone"}</Label>
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
                    <Label className="text-xs">{locale === "hi" ? "यात्रा तिथि" : "Travel Date"}</Label>
                    <Input
                      type="date"
                      value={bookingForm.travelDate}
                      onChange={(e) => setBookingForm((f) => ({ ...f, travelDate: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{locale === "hi" ? "मेहमान" : "Guests"}</Label>
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
                    <Label className="text-xs">{locale === "hi" ? "पिकअप शहर" : "Pickup City"}</Label>
                    <Input
                      value={bookingForm.pickupCity}
                      onChange={(e) => setBookingForm((f) => ({ ...f, pickupCity: e.target.value }))}
                      className="h-9"
                    />
                  </div>
                </div>
                <Button className="w-full" disabled={paying} onClick={() => void handlePay()}>
                  {paying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {locale === "hi" ? "Pay Now — Razorpay 💳" : "Pay Now — Razorpay 💳"}
                  {packageQuote && ` · ${formatCurrency(packageQuote.totalAmount, locale)}`}
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {locale === "hi" ? "सोच रहा हूं…" : "Thinking…"}
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t px-3 py-2">
            {quickReplies.map((qr) => (
              <Button
                key={qr.id}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={loading}
                onClick={() => void sendMessage(qr.value)}
              >
                {qr.label}
              </Button>
            ))}
          </div>
        )}

        <form
          className="flex items-center gap-2 border-t p-3"
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
              locale === "hi"
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
  );
}

function PackageQuoteCard({
  quote,
  locale,
  onBook,
}: {
  quote: CustomPackageQuote;
  locale: "en" | "hi";
  onBook: () => void;
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
      <Button size="sm" className="mt-2 w-full" onClick={onBook}>
        {locale === "hi" ? "Book Now 📅" : "Book Now 📅"}
      </Button>
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
