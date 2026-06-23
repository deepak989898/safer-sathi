"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Send, User, Volume2 } from "lucide-react";
import { AssistantIcon } from "@/components/icons/assistant-icon";
import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { useContinuousVoice } from "@/hooks/use-continuous-voice";
import { formatCurrency, localizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ChatMessage, TourPackage, Vehicle } from "@/types";

const SUGGESTIONS_EN = [
  "Plan a 5-day trip to Rajasthan",
  "Best honeymoon destinations in India",
  "Find tempo traveller for group of 15",
  "Budget hotels in Goa under ₹5000",
];

const SUGGESTIONS_HI = [
  "राजस्थान की 5 दिन की यात्रा की योजना बनाएं",
  "भारत में सर्वश्रेष्ठ हनीमून स्थल",
  "15 लोगों के लिए टेंपो ट्रैवलर खोजें",
  "गोवा में ₹5000 के अंदर बजट होटल",
];

function getWelcomeMessage(locale: "en" | "hi"): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content:
      locale === "hi"
        ? "नमस्ते! मैं आपका Safar Sathi यात्रा सहायक हूं। मैं यात्रा योजना, पैकेज, वाहन, होटल बुकिंग और आपकी पूछताछ में मदद कर सकता हूं। आप हिंदी में भी पूछ सकते हैं। आज मैं आपकी कैसे सहायता करूं?"
        : "Hello! I'm your Safar Sathi travel assistant. I can help you plan trips, find packages, book vehicles, hotels, and answer travel questions. How can I help you today?",
    timestamp: new Date().toISOString(),
  };
}

export default function AIAssistantPage() {
  const { locale: siteLocale } = useAppStore();
  const aiLocale: "en" | "hi" = "hi";
  const [messages, setMessages] = useState<ChatMessage[]>(() => [getWelcomeMessage(aiLocale)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const suggestions = SUGGESTIONS_HI;

  const sendMessage = useCallback(
    async (text: string): Promise<string | undefined> => {
      if (!text.trim() || loading) return undefined;

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };

      const history = [...messagesRef.current, userMsg]
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/ai/travel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, locale: aiLocale, history }),
        });

        const json = await res.json();

        if (!json.success) {
          throw new Error(json.error ?? "Failed to get response");
        }

        const reply: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: json.data.reply,
          packages: json.data.recommendations?.packages ?? [],
          vehicles: json.data.recommendations?.vehicles ?? [],
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, reply]);
        return json.data.reply as string;
      } catch {
        toast.error(
          aiLocale === "hi"
            ? "सहायक से संपर्क नहीं हो पाया। कृपया पुनः प्रयास करें।"
            : "Could not reach assistant. Please try again."
        );
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content:
              aiLocale === "hi"
                ? "क्षमा करें, अभी कनेक्शन में समस्या है। कृपया दोबारा प्रयास करें।"
                : "Sorry, I'm having trouble connecting right now. Please try again.",
            timestamp: new Date().toISOString(),
          },
        ]);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [aiLocale, loading]
  );

  const {
    voiceActive,
    listening,
    speaking,
    speak,
    toggleVoiceMode,
    stopVoiceMode,
  } = useContinuousVoice({
    locale: aiLocale,
    onTranscript: async (text) => {
      const reply = await sendMessage(text);
      if (reply) await speak(reply);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, speaking]);

  const handleVoiceToggle = () => {
    try {
      if (voiceActive) {
        toggleVoiceMode();
        return;
      }
      toggleVoiceMode();
      toast.message(
        aiLocale === "hi"
          ? "वॉइस चैट शुरू — बोलिए, मैं सुन रहा हूँ"
          : "Voice chat on — speak naturally, I'm listening"
      );
    } catch {
      toast.error(
        aiLocale === "hi" ? "यह ब्राउज़र वॉइस सपोर्ट नहीं करता" : "Voice not supported in this browser"
      );
    }
  };

  useEffect(() => () => stopVoiceMode(), [stopVoiceMode]);

  return (
    <>
      <PageHero
        title={siteLocale === "hi" ? "यात्रा सहायक" : "Travel Assistant"}
        subtitle={
          siteLocale === "hi"
            ? "अपनी अगली यात्रा के लिए व्यक्तिगत सुझाव पाएं"
            : "Get personalized recommendations for your next journey"
        }
        image={HERO_IMAGES.assistant}
      />

      <section className="container mx-auto px-4 py-6 sm:py-10">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div className="order-2 space-y-4 lg:order-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white p-2 shadow-sm ring-1 ring-border">
                    <AssistantIcon className="h-full w-full" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {siteLocale === "hi" ? "Safar Sathi सहायक" : "Safar Sathi Assistant"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {siteLocale === "hi" ? "हमेशा ऑनलाइन · हिंदी / English" : "Always online · EN / HI"}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  {siteLocale === "hi"
                    ? "गंतव्य, पैकेज, वाहन, होटल के बारे में पूछें। माइक दबाकर बातचीत शुरू करें — जैसे दो लोग बात करते हैं।"
                    : "Ask about destinations, packages, vehicles, and hotels. Tap the mic for a natural voice conversation."}
                </p>
              </CardContent>
            </Card>

            <Card className="lg:order-1">
              <CardContent className="pt-6">
                <p className="mb-3 text-sm font-medium">
                  {siteLocale === "hi" ? "त्वरित सुझाव" : "Quick Suggestions"}
                </p>
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage(s)}
                      className="w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-primary hover:bg-primary/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="order-1 flex min-h-[420px] flex-col sm:min-h-[500px] lg:order-2 lg:h-[600px] lg:min-h-0">
            <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-3">
                    <div
                      className={cn(
                        "flex gap-2 sm:gap-3",
                        msg.role === "user" ? "flex-row-reverse" : ""
                      )}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback
                          className={
                            msg.role === "assistant"
                              ? "bg-white p-0.5"
                              : "bg-muted"
                          }
                        >
                          {msg.role === "assistant" ? (
                            <AssistantIcon className="h-full w-full" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2.5 text-sm sm:max-w-[80%] sm:px-4",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {msg.content}
                      </div>
                    </div>

                    {msg.role === "assistant" && msg.packages && msg.packages.length > 0 && (
                      <div className="ml-10 grid gap-2 sm:grid-cols-2">
                        {msg.packages.map((pkg) => (
                          <ChatPackageCard key={pkg.id} pkg={pkg} locale={siteLocale} />
                        ))}
                      </div>
                    )}

                    {msg.role === "assistant" && msg.vehicles && msg.vehicles.length > 0 && (
                      <div className="ml-10 space-y-2">
                        {msg.vehicles.map((v) => (
                          <ChatVehicleCard key={v.id} vehicle={v} locale={siteLocale} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-white p-0.5">
                        <AssistantIcon className="h-full w-full" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm">
                      <span className="animate-pulse">
                        {aiLocale === "hi" ? "सोच रहा हूं..." : "Thinking..."}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t p-3 sm:p-4">
              {voiceActive && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-primary">
                  {speaking ? (
                    <>
                      <Volume2 className="h-4 w-4 shrink-0 animate-pulse" />
                      {aiLocale === "hi" ? "जवाब बोल रहा हूँ…" : "Speaking reply…"}
                    </>
                  ) : listening ? (
                    <>
                      <Mic className="h-4 w-4 shrink-0 animate-pulse" />
                      {aiLocale === "hi" ? "सुन रहा हूँ — बोलिए" : "Listening — speak now"}
                    </>
                  ) : loading ? (
                    <>
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                      {aiLocale === "hi" ? "सोच रहा हूँ…" : "Thinking…"}
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 shrink-0" />
                      {aiLocale === "hi" ? "वॉइस चैट चालू" : "Voice chat active"}
                    </>
                  )}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!voiceActive) void sendMessage(input);
                }}
                className="flex gap-2"
              >
                <Button
                  type="button"
                  size="icon"
                  variant={voiceActive ? "default" : "outline"}
                  className="h-10 w-10 shrink-0"
                  disabled={loading}
                  onClick={handleVoiceToggle}
                  aria-label={voiceActive ? "Stop voice chat" : "Start voice chat"}
                >
                  {voiceActive ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                {!voiceActive && (
                  <>
                    <Input
                      placeholder={
                        aiLocale === "hi"
                          ? "गंतव्य, पैकेज, वाहन के बारे में पूछें..."
                          : "Ask about destinations, packages, vehicles..."
                      }
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={loading}
                      className="min-h-10"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      disabled={loading || !input.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </form>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}

function ChatPackageCard({
  pkg,
  locale,
}: {
  pkg: TourPackage;
  locale: "en" | "hi";
}) {
  return (
    <Link
      href={`/packages/${pkg.slug}`}
      className="flex gap-3 rounded-lg border bg-card p-2 transition-colors hover:border-primary"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
        <Image
          src={pkg.images[0]}
          alt={localizedText(pkg.title, locale)}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-medium">
          {localizedText(pkg.title, locale)}
        </p>
        <p className="text-xs text-muted-foreground">
          {localizedText(pkg.durationLabel, locale)}
        </p>
        <p className="text-sm font-semibold text-primary">
          {formatCurrency(pkg.price, locale)}
        </p>
      </div>
    </Link>
  );
}

function ChatVehicleCard({
  vehicle,
  locale,
}: {
  vehicle: Vehicle;
  locale: "en" | "hi";
}) {
  return (
    <Link
      href={`/vehicles/${vehicle.id}`}
      className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 transition-colors hover:border-primary"
    >
      <div>
        <p className="text-sm font-medium">{localizedText(vehicle.name, locale)}</p>
        <p className="text-xs text-muted-foreground">{vehicle.seats} seats</p>
      </div>
      <p className="text-sm font-semibold text-primary">
        {formatCurrency(vehicle.pricePerDay, locale)}/day
      </p>
    </Link>
  );
}
