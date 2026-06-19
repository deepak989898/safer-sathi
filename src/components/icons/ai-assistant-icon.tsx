import Image from "next/image";
import { cn } from "@/lib/utils";

const AI_ASSISTANT_ICON = "/images/ai-assistant.png";

interface AiAssistantIconProps {
  className?: string;
  size?: number;
  priority?: boolean;
}

/** Branded AI assistant mic + sparkle icon */
export function AiAssistantIcon({
  className,
  size = 40,
  priority = false,
}: AiAssistantIconProps) {
  return (
    <Image
      src={AI_ASSISTANT_ICON}
      alt=""
      width={size}
      height={size}
      priority={priority}
      aria-hidden
      className={cn("object-contain", className)}
    />
  );
}

export { AI_ASSISTANT_ICON };
