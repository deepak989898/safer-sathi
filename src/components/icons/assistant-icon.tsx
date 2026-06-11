import { cn } from "@/lib/utils";

interface AssistantIconProps {
  className?: string;
}

/** Travel assistant: message bubble with location pin */
export function AssistantIcon({ className }: AssistantIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("h-6 w-6", className)}
    >
      <path
        d="M5.25 4.5h13.5A1.75 1.75 0 0120.5 6.25v6.75A1.75 1.75 0 0118.75 14.75H15.5l-3.25 2.75V14.75H5.25A1.75 1.75 0 013.5 13V6.25A1.75 1.75 0 015.25 4.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.25a2 2 0 110 4 2 2 0 010-4Z"
        fill="currentColor"
      />
      <path
        d="M12 11.25v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
