"use client";

import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TripJackApiErrorDetails {
  context: string;
  message: string;
  status?: number;
  contentType?: string;
  rawPreview?: string;
}

export function TripJackApiErrorPanel({
  error,
  onDismiss,
}: {
  error: TripJackApiErrorDetails | null;
  onDismiss?: () => void;
}) {
  if (!error) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <div className="min-w-0 space-y-2">
            <p className="font-semibold">{error.context}</p>
            <pre className="whitespace-pre-wrap break-words font-mono text-xs">{error.message}</pre>
            {error.status != null ? (
              <p className="text-xs">
                <span className="font-medium">Status:</span> {error.status}
              </p>
            ) : null}
            {error.contentType ? (
              <p className="text-xs">
                <span className="font-medium">Content-Type:</span> {error.contentType}
              </p>
            ) : null}
            {error.rawPreview && !error.message.includes(error.rawPreview) ? (
              <div>
                <p className="text-xs font-medium">Response body preview</p>
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-red-100/60 p-2 font-mono text-xs">
                  {error.rawPreview}
                </pre>
              </div>
            ) : null}
          </div>
        </div>
        {onDismiss ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-red-700 hover:bg-red-100"
            onClick={onDismiss}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
