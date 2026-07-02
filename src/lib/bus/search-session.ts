"use client";

import type { BusSearchDebug } from "@/lib/bus/debug";
import type { BusSearchParams, BusSelectedTrip } from "@/lib/bus/session";

const SEARCH_RESULTS_KEY = "safarsathi_bus_search_results";

export interface BusSearchResultSession {
  search: BusSearchParams;
  trips: BusSelectedTrip[];
  count: number;
  message: string;
  debug?: BusSearchDebug | null;
  fetchedAt: string;
}

export function saveBusSearchResults(session: BusSearchResultSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SEARCH_RESULTS_KEY, JSON.stringify(session));
}

export function loadBusSearchResults(): BusSearchResultSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SEARCH_RESULTS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BusSearchResultSession;
  } catch {
    return null;
  }
}

export function clearBusSearchResults(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SEARCH_RESULTS_KEY);
}
