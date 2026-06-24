import { cn } from "@/lib/utils";

const AI_ASSISTANT_ICON = "/images/ai-assistant.png";

interface AiAssistantIconProps {
  className?: string;
  size?: number;
  /** @deprecated PNG asset unused; kept for call-site compatibility */
  priority?: boolean;
}

/** Branded AI assistant mic + sparkle icon (vector — scales cleanly in FAB) */
export function AiAssistantIcon({
  className,
  size = 40,
}: AiAssistantIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={cn("block shrink-0", className)}
      aria-hidden
    >
      <rect x="22" y="12" width="20" height="30" rx="10" fill="#1e40af" />
      <rect x="26" y="16" width="12" height="18" rx="6" fill="#3b82f6" opacity="0.45" />
      <path
        d="M18 34c0 9.941 8.059 18 18 18s18-8.059 18-18"
        stroke="#1e40af"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M32 52v6" stroke="#1e40af" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 58h16" stroke="#1e40af" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M46 14l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#f97316" />
      <path d="M12 24l1.5 4.5L18 30l-4.5 1.5L12 36l-1.5-4.5L6 30l4.5-1.5z" fill="#fbbf24" />
    </svg>
  );
}

export { AI_ASSISTANT_ICON };
