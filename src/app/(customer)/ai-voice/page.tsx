import VoiceAssistantClient from "./voice-assistant-client";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "AI Voice Assistant | Safar Sathi",
  description: "Speak in Hindi or English to plan tours and book with Safar Sathi AI Voice Assistant.",
  path: "/ai-voice",
  keywords: ["voice travel assistant", "Hindi voice booking", "AI trip planner", "Safar Sathi voice"],
});

export default function AiVoicePage() {
  return <VoiceAssistantClient />;
}
