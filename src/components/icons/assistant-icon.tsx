import { cn } from "@/lib/utils";

interface AssistantIconProps {
  className?: string;
}

/** Travel assistant mark: compass ring + map pin + chat bubble */
export function AssistantIcon({ className }: AssistantIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("h-6 w-6", className)}
    >
      <circle
        cx="11"
        cy="11"
        r="6.75"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M11 6.25v2.1M11 13.65v2.1M6.25 11h2.1M13.65 11h2.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M11 8.35l.85 1.75 1.95.2-1.45 1.25.45 1.9L11 12.35l-1.8.95.45-1.9-1.45-1.25 1.95-.2L11 8.35z"
        fill="currentColor"
      />
      <path
        d="M15.5 15.5c1.35 1.05 2.25 2.65 2.25 4.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M17.75 18.75h3.5l-1.75 1.75V17"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
