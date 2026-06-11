"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { Send, User } from "lucide-react";
import { AssistantIcon } from "@/components/icons/assistant-icon";
import { PageHero } from "@/components/customer/page-hero";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useAppStore } from "@/store/app-store";
import { formatCurrency, localizedText } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ChatMessage, TourPackage, Vehicle } from "@/types";

const suggestions = [
  "Plan a 5-day trip to Rajasthan",
  "Best honeymoon destinations in India",
  "Find tempo traveller for group of 15",
  "Budget hotels in Goa under ₹5000",
];

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hello! I'm your Safar Sathi travel assistant. I can help you plan trips, find packages, book vehicles, and answer travel questions. How can I help you today?",
    timestamp: new Date().toISOString(),
  },
];

export default function AIAssistantPage() {
  const { locale } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/ai/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, locale, history }),
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
    } catch {
      toast.error("Could not reach assistant. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "Sorry, I'm having trouble connecting right now. Please try again or browse our packages and vehicles directly.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHero
        title="Travel Assistant"
        subtitle="Get personalized recommendations for your next journey"
        image={HERO_IMAGES.assistant}
      />

      <section className="container mx-auto px-4 py-6 sm:py-10">
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div className="order-2 space-y-4 lg:order-1">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <AssistantIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="font-semibold">Safar Sathi Assistant</p>
                    <p className="text-xs text-muted-foreground">Always online · EN / HI</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Ask about destinations, packages, vehicles, hotels, budgets, and
                  itineraries across India.
                </p>
              </CardContent>
            </Card>

            <Card className="hidden sm:block">
              <CardContent className="pt-6">
                <p className="mb-3 text-sm font-medium">Quick Suggestions</p>
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

          <Card className="order-1 flex min-h-[420px] flex-col sm:min-h-[500px] lg:h-[600px] lg:min-h-0">
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
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }
                        >
                          {msg.role === "assistant" ? (
                            <AssistantIcon className="h-4 w-4" />
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
                          <ChatPackageCard key={pkg.id} pkg={pkg} locale={locale} />
                        ))}
                      </div>
                    )}

                    {msg.role === "assistant" && msg.vehicles && msg.vehicles.length > 0 && (
                      <div className="ml-10 space-y-2">
                        {msg.vehicles.map((v) => (
                          <ChatVehicleCard key={v.id} vehicle={v} locale={locale} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <AssistantIcon className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t p-3 sm:p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Ask about destinations, packages, vehicles..."
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
