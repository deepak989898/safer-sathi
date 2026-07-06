"use client";

import { Badge } from "@/components/ui/badge";
import {
  derivePipelineStatus,
  pipelineStatusBadgeClass,
  pipelineStatusLabel,
} from "@/lib/flights/pipeline-status";
import type { FlightBookingRecord } from "@/lib/flights/types";

export function FlightPipelineStatusBadge({ booking }: { booking: FlightBookingRecord }) {
  const status = derivePipelineStatus(booking);
  if (!status) return null;

  return (
    <Badge className={pipelineStatusBadgeClass(status)} variant="secondary">
      {pipelineStatusLabel(status)}
    </Badge>
  );
}
