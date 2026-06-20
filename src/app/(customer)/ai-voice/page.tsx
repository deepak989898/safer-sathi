import VoiceAssistantClient from "./voice-assistant-client";

export const metadata = {
  title: "AI Voice Assistant | Safar Sathi",
  description: "Speak in Hindi or English to plan tours and book with Safar Sathi AI Voice Assistant.",
};

export default function AiVoicePage() {
  return <VoiceAssistantClient />;
}
