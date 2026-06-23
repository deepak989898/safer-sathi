"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSpeechRecognitionLang } from "@/lib/ai/travel-manager/native-languages";
import type { Locale } from "@/types";

interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

interface SpeechRecognitionResultEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionInstance)
  | undefined {
  if (typeof window === "undefined") return undefined;
  const win = window as typeof window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition;
}

interface UseContinuousVoiceOptions {
  locale: Locale;
  nativeLanguage?: string;
  onTranscript: (text: string) => Promise<void>;
  /** When true, blocks starting the mic (e.g. during payment) but does not end voice mode mid-turn. */
  pauseListening?: boolean;
}

export function useContinuousVoice({
  locale,
  nativeLanguage = "",
  onTranscript,
  pauseListening = false,
}: UseContinuousVoiceOptions) {
  const [voiceActive, setVoiceActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const voiceActiveRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const busyRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const stopRecognition = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      const cleaned = text.trim();
      if (!cleaned || typeof window === "undefined" || !window.speechSynthesis) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(cleaned);
        utter.lang = locale === "hi" ? "hi-IN" : "en-IN";
        utter.rate = 0.95;
        const voices = window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => v.lang.startsWith(locale === "hi" ? "hi" : "en")) ??
          voices[0];
        if (preferred) utter.voice = preferred;
        utter.onstart = () => setSpeaking(true);
        utter.onend = () => {
          setSpeaking(false);
          resolve();
        };
        utter.onerror = () => {
          setSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(utter);
      });
    },
    [locale]
  );

  const startListening = useCallback(() => {
    if (
      pauseListening ||
      !voiceActiveRef.current ||
      busyRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    const SR = getSpeechRecognitionCtor();
    if (!SR) return;

    stopRecognition();

    const recognition = new SR();
    recognition.lang = getSpeechRecognitionLang(locale, nativeLanguage);
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: SpeechRecognitionResultEvent) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      if (!transcript || !voiceActiveRef.current) return;

      busyRef.current = true;
      setListening(false);
      void onTranscriptRef
        .current(transcript)
        .catch(() => undefined)
        .finally(() => {
          busyRef.current = false;
          if (voiceActiveRef.current && !pauseListening) {
            window.setTimeout(() => startListening(), 400);
          }
        });
    };

    recognition.onerror = () => {
      setListening(false);
      if (voiceActiveRef.current && !busyRef.current && !pauseListening) {
        window.setTimeout(() => startListening(), 800);
      }
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [pauseListening, locale, nativeLanguage, stopRecognition]);

  const speakAndListen = useCallback(
    async (text: string) => {
      if (!voiceActiveRef.current) return;
      await speak(text);
      if (voiceActiveRef.current && !busyRef.current) {
        startListening();
      }
    },
    [speak, startListening]
  );

  const stopVoiceMode = useCallback(() => {
    voiceActiveRef.current = false;
    setVoiceActive(false);
    busyRef.current = false;
    stopRecognition();
    if (typeof window !== "undefined") {
      window.speechSynthesis?.cancel();
    }
    setSpeaking(false);
  }, [stopRecognition]);

  const startVoiceMode = useCallback(() => {
    const SR = getSpeechRecognitionCtor();
    if (!SR) {
      throw new Error("Speech recognition not supported in this browser");
    }
    voiceActiveRef.current = true;
    setVoiceActive(true);
    startListening();
  }, [startListening]);

  const toggleVoiceMode = useCallback(() => {
    if (voiceActiveRef.current) {
      stopVoiceMode();
      return;
    }
    startVoiceMode();
  }, [startVoiceMode, stopVoiceMode]);

  useEffect(() => {
    if (pauseListening) {
      stopRecognition();
    } else if (voiceActiveRef.current && !busyRef.current) {
      startListening();
    }
  }, [pauseListening, startListening, stopRecognition]);

  useEffect(() => {
    return () => {
      stopVoiceMode();
    };
  }, [stopVoiceMode]);

  return {
    voiceActive,
    listening,
    speaking,
    speak,
    speakAndListen,
    startVoiceMode,
    stopVoiceMode,
    toggleVoiceMode,
    startListening,
  };
}
