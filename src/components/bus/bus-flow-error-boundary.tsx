"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackHref?: string;
}

interface State {
  hasError: boolean;
}

export class BusFlowErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[bus-flow]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Unable to load this step</h1>
          <p className="max-w-md text-sm text-slate-600">
            Something went wrong while loading the bus booking screen. Please go back and try
            again.
          </p>
          <div className="flex gap-3">
            <Button className="bg-[#1a4fa3]" onClick={() => this.setState({ hasError: false })}>
              Try again
            </Button>
            <Button variant="outline" onClick={() => window.location.assign(this.props.fallbackHref ?? "/bus/results")}>
              Back to buses
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
