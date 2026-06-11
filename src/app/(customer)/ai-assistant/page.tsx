"use client";

import { useRef, useState } from "react";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types";

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
      "Hello! I'm your Safar Sathi AI travel assistant. I can help you plan trips, find packages, book vehicles, and answer travel questions. How can I help you today?",
    timestamp: new Date().toISOString(),
  },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    setTimeout(() => {
      const reply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: getAIResponse(text),
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, reply]);
      setLoading(false);
    }, 1000);
  };

  return (
    <>
      <PageHero
        title="AI Travel Assistant"
        subtitle="Get personalized recommendations powered by intelligent AI"
      />

      <section className="container mx-auto px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold">Safar AI</p>
                    <p className="text-xs text-muted-foreground">Always online</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  Ask me anything about travel in India — destinations, packages,
                  vehicles, hotels, and more.
                </p>
              </CardContent>
            </Card>

            <Card>
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

          <Card className="flex h-[600px] flex-col">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-3",
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
                          <Bot className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm">
                      <span className="animate-pulse">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="border-t p-4">
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
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()}>
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

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("rajasthan") || lower.includes("5-day")) {
    return "Great choice! I'd recommend our Golden Triangle Tour covering Delhi, Agra, and Jaipur — 5 nights/6 days starting at ₹24,999. Would you like me to show available dates or suggest hotels?";
  }
  if (lower.includes("honeymoon")) {
    return "For honeymoons, our Kerala Backwaters package is perfect — houseboat stay, Munnar hills, and candlelight dinner from ₹35,999. Shall I check availability for your dates?";
  }
  if (lower.includes("tempo") || lower.includes("group")) {
    return "We have a Force Tempo Traveller 17-seater available in Agra at ₹5,500/day with driver included. Perfect for group tours! Want me to help you book it?";
  }
  if (lower.includes("goa") || lower.includes("hotel") || lower.includes("budget")) {
    return "Goa Beach Paradise starts from ₹5,500/night with beach access, pool, and water sports. I can also filter 3-star options under ₹5,000. What's your travel date?";
  }
  return "I'd be happy to help with that! You can browse our tour packages, hotels, and vehicles on the platform, or tell me more about your destination, dates, and budget for personalized recommendations.";
}
