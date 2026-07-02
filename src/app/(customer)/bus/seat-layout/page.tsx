import { BusFlowClient } from "@/components/bus/bus-flow-client";
import { BusFlowErrorBoundary } from "@/components/bus/bus-flow-error-boundary";

export default function BusSeatLayoutPage() {
  return (
    <BusFlowErrorBoundary fallbackHref="/bus/results">
      <BusFlowClient step="seat-layout" />
    </BusFlowErrorBoundary>
  );
}
