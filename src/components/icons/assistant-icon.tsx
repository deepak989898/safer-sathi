import { AiAssistantIcon } from "@/components/icons/ai-assistant-icon";
import { cn } from "@/lib/utils";

interface AssistantIconProps {
  className?: string;
}

/** Branded AI assistant icon (mic + sparkle) */
export function AssistantIcon({ className }: AssistantIconProps) {
  return <AiAssistantIcon className={cn("h-6 w-6", className)} size={24} />;
}

export { AiAssistantIcon };
