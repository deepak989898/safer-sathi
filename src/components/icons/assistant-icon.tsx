import { cn } from "@/lib/utils";

interface AssistantIconProps {
  className?: string;
}

/** Travel assistant: sparkle compass bot — friendly & distinctive */
export function AssistantIcon({ className }: AssistantIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("h-6 w-6", className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 4.5l1 2M18.5 4.5l-1 2M4.5 18.5l2-1M19.5 18.5l-2-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 3.5v1M12 19.5v1M3.5 12h1M19.5 12h1"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="17" cy="7" r="1.25" fill="currentColor" />
    </svg>
  );
}
