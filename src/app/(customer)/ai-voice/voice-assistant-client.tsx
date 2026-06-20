"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, Loader2, Send } from "lucide-react";
import { PageHero } from "@/components/customer/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useTravelCheckout } from "@/hooks/use-travel-checkout";
import { HERO_IMAGES } from "@/lib/media/travel-images";
import type { VoiceConversationState } from "@/lib/ai-center/voice-conversation-engine";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

interface VoiceSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((ev: VoiceSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
interface VoiceSpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

export default function VoiceAssistantClient() {
  const { user } = useAuth();
  const { completeBooking, paying } = useTravelCheckout();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [state, setState] = useState<VoiceConversationState>({
    step: "greeting",
    locale: "en",
  });
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localePref, setLocalePref] = useState<"auto" | "en" | "hi">("auto");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const recognitionRef = useRef<VoiceSpeechRecognition | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const speak = useCallback(
    (text: string, locale: "en" | "hi") => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = locale === "hi" ? "hi-IN" : "en-IN";
      utter.rate = 0.95;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find((v) =>
        voiceGender === "female"
          ? v.name.toLowerCase().includes("female") || v.name.includes("Google")
          : v.name.toLowerCase().includes("male")
      );
      if (preferred) utter.voice = preferred;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    },
    [voiceGender]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const isInit = trimmed === "__init__";
      if (!isInit) {
        setMessages((m) => [...m, { role: "user", text: trimmed }]);
      }
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/ai/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            state,
            locale: localePref,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        const { reply, locale, state: nextState, readyForPayment } = json.data;
        setState(nextState);
        setMessages((m) => [...m, { role: "assistant", text: reply }]);
        speak(reply, locale);

        if (readyForPayment && nextState.modifiedPackage) {
          const pkg = nextState.modifiedPackage;
          await completeBooking({
            customerName: nextState.customerName ?? user?.name ?? "Guest",
            customerEmail: nextState.customerEmail ?? user?.email ?? "guest@safarsathi.com",
            customerPhone: nextState.customerPhone ?? user?.phone ?? "9999999999",
            travelDate: nextState.travelDate ?? new Date().toISOString().slice(0, 10),
            guests: nextState.guests ?? 2,
            userId: user?.id,
            packageQuote: {
              serviceId: pkg.id,
              title: pkg.title,
              destination: pkg.destination,
              durationDays: pkg.duration,
              guests: nextState.guests ?? 2,
              activities: [],
              meals: [],
              lineItems: [{ label: pkg.title, detail: pkg.destination, amount: pkg.price }],
              totalAmount: pkg.price,
              notes: "AI Voice Assistant booking",
            },
          });
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Voice assistant error");
      } finally {
        setLoading(false);
      }
    },
    [state, localePref, speak, completeBooking, user]
  );

  useEffect(() => {
    void sendMessage("__init__");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const toggleVoice = () => {
    const win = window as typeof window & {
      SpeechRecognition?: new () => VoiceSpeechRecognition;
      webkitSpeechRecognition?: new () => VoiceSpeechRecognition;
    };
    const SpeechRecognitionAPI = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognitionAPI() as VoiceSpeechRecognition;
    recognition.lang = localePref === "hi" ? "hi-IN" : localePref === "en" ? "en-IN" : "hi-IN";
    recognition.interimResults = false;
    recognition.onresult = (event: VoiceSpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript) void sendMessage(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <>
      <PageHero
        title="AI Voice Assistant"
        subtitle="Speak in Hindi or English — plan tours, hotels, vehicles & book with Razorpay"
        image={HERO_IMAGES.assistant}
      />
      <section className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex flex-wrap gap-3">
          <Select value={localePref} onValueChange={(v) => setLocalePref(v as typeof localePref)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto Language</SelectItem>
              <SelectItem value="hi">Hindi</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
          <Select value={voiceGender} onValueChange={(v) => setVoiceGender(v as typeof voiceGender)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="female">Female Voice</SelectItem>
              <SelectItem value="male">Male Voice</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div ref={scrollRef} className="h-[420px] space-y-3 overflow-y-auto p-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                    msg.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.text}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Thinking...
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t p-3">
              <Button
                type="button"
                size="icon"
                variant={listening ? "destructive" : "outline"}
                onClick={toggleVoice}
                aria-label={listening ? "Stop listening" : "Start voice input"}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={state.locale === "hi" ? "Apna sawal likhen..." : "Type or speak..."}
                onKeyDown={(e) => e.key === "Enter" && void sendMessage(input)}
                disabled={loading || paying}
              />
              <Button
                size="icon"
                onClick={() => void sendMessage(input)}
                disabled={loading || paying || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
              {speaking && (
                <Volume2 className="h-4 w-4 animate-pulse text-primary" aria-hidden />
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
