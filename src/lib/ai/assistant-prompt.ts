export const AI_ASSISTANT_SEEN_KEY = "safar_sathi_ai_assistant_seen";

export function markAiAssistantSeen(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AI_ASSISTANT_SEEN_KEY, "1");
}

export function hasSeenAiAssistant(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(AI_ASSISTANT_SEEN_KEY) === "1";
}
