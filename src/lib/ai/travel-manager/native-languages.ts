import type { Locale } from "@/types";
import { getSmartGreeting } from "@/lib/ai/travel-manager/geo-language";

export type NativeLanguageCode =
  | "ta"
  | "te"
  | "gu"
  | "bn"
  | "mr"
  | "kn"
  | "ml"
  | "pa"
  | "or"
  | "as"
  | "ur";

export interface NativeLanguageOption {
  code: NativeLanguageCode;
  name: string;
  nameNative: string;
  speechCode: string;
}

export const NATIVE_LANGUAGE_OPTIONS: NativeLanguageOption[] = [
  { code: "ta", name: "Tamil", nameNative: "தமிழ்", speechCode: "ta-IN" },
  { code: "te", name: "Telugu", nameNative: "తెలుగు", speechCode: "te-IN" },
  { code: "gu", name: "Gujarati", nameNative: "ગુજરાતી", speechCode: "gu-IN" },
  { code: "bn", name: "Bengali", nameNative: "বাংলা", speechCode: "bn-IN" },
  { code: "mr", name: "Marathi", nameNative: "मराठी", speechCode: "mr-IN" },
  { code: "kn", name: "Kannada", nameNative: "ಕನ್ನಡ", speechCode: "kn-IN" },
  { code: "ml", name: "Malayalam", nameNative: "മലയാളം", speechCode: "ml-IN" },
  { code: "pa", name: "Punjabi", nameNative: "ਪੰਜਾਬੀ", speechCode: "pa-IN" },
  { code: "or", name: "Odia", nameNative: "ଓଡ଼ିଆ", speechCode: "or-IN" },
  { code: "as", name: "Assamese", nameNative: "অসমীয়া", speechCode: "as-IN" },
  { code: "ur", name: "Urdu", nameNative: "اردو", speechCode: "ur-IN" },
];

export function getNativeLanguageOption(code?: string): NativeLanguageOption | undefined {
  if (!code) return undefined;
  return NATIVE_LANGUAGE_OPTIONS.find((option) => option.code === code);
}

export function getSpeechRecognitionLang(locale: Locale, nativeLanguage?: string): string {
  const native = getNativeLanguageOption(nativeLanguage);
  if (native?.speechCode) return native.speechCode;
  return locale === "hi" ? "hi-IN" : "en-IN";
}

export function getNativeLanguageAcknowledgment(
  nativeLanguage: string | undefined,
  locale: Locale
): string {
  const option = getNativeLanguageOption(nativeLanguage);
  if (!option) return "";

  if (locale === "hi") {
    return `\n\n🗣️ आप ${option.nameNative} (${option.name}) में भी बात कर सकते हैं — मैं समझूँगा और हिंदी/English में जवाब दूँगा।`;
  }

  return `\n\n🗣️ You can also speak in ${option.name} (${option.nameNative}) — I'll understand and reply in English/Hindi.`;
}

export function buildInstantWelcomeMessage(locale: Locale, nativeLanguage?: string): string {
  let reply = getSmartGreeting(undefined, locale);
  reply += locale === "hi" ? "\n\nआज आप क्या चाहेंगे?" : "\n\nWhat would you like today?";
  reply += getNativeLanguageAcknowledgment(nativeLanguage, locale);
  return reply;
}
