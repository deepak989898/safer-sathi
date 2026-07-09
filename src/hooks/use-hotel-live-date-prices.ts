"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_LISTING_HIDS } from "@/lib/tripjack-hotels/catalog-types";
import { buildNextStayDates } from "@/lib/tripjack-hotels/next-stay-dates";

export type HotelLivePriceMap = Record<string, { price: number; currency: string } | null>;

function chunkHids(hids: number[]): number[][] {
  const unique = [...new Set(hids.filter((id) => id > 0))];
  const chunks: number[][] = [];
  for (let i = 0; i < unique.length; i += MAX_LISTING_HIDS) {
    chunks.push(unique.slice(i, i + MAX_LISTING_HIDS));
  }
  return chunks;
}

function minPriceFromMap(prices: HotelLivePriceMap | undefined): number | null {
  if (!prices) return null;
  let min: number | null = null;
  for (const entry of Object.values(prices)) {
    if (entry && entry.price > 0 && (min === null || entry.price < min)) {
      min = entry.price;
    }
  }
  return min;
}

async function fetchPricesForStay(
  hids: number[],
  checkIn: string,
  checkOut: string
): Promise<HotelLivePriceMap> {
  const chunks = chunkHids(hids);
  if (!chunks.length) return {};

  const merged: HotelLivePriceMap = {};
  for (const batch of chunks) {
    const res = await fetch("/api/hotels/featured-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hids: batch, checkIn, checkOut }),
    });
    const json = await res.json();
    if (json.success && json.data?.prices) {
      Object.assign(merged, json.data.prices as HotelLivePriceMap);
    }
  }
  return merged;
}

export function hotelHasLivePrice(
  prices: HotelLivePriceMap,
  tjHotelId: number | string
): boolean {
  const entry = prices[String(tjHotelId)];
  return Boolean(entry && entry.price > 0);
}

export function useHotelLiveDatePrices(hids: number[], enabled = true) {
  const stayDates = useMemo(() => buildNextStayDates(7), []);
  const hidsKey = useMemo(() => [...new Set(hids.filter((id) => id > 0))].sort((a, b) => a - b).join(","), [hids]);
  const [selectedCheckIn, setSelectedCheckIn] = useState(stayDates[0]?.checkIn ?? "");
  const [pricesByCheckIn, setPricesByCheckIn] = useState<Record<string, HotelLivePriceMap>>({});
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set());
  const loadedDatesRef = useRef<Set<string>>(new Set());
  const requestIdRef = useRef(0);

  const loadDatePrices = useCallback(
    async (checkIn: string, checkOut: string) => {
      if (!enabled || !hidsKey) return;
      if (loadedDatesRef.current.has(checkIn)) return;

      loadedDatesRef.current.add(checkIn);
      setLoadingDates((prev) => new Set(prev).add(checkIn));
      try {
        const idList = hidsKey.split(",").map(Number);
        const prices = await fetchPricesForStay(idList, checkIn, checkOut);
        setPricesByCheckIn((prev) => ({ ...prev, [checkIn]: prices }));
      } catch {
        setPricesByCheckIn((prev) => ({ ...prev, [checkIn]: {} }));
      } finally {
        setLoadingDates((prev) => {
          const next = new Set(prev);
          next.delete(checkIn);
          return next;
        });
      }
    },
    [enabled, hidsKey]
  );

  useEffect(() => {
    if (!enabled || !hidsKey) {
      setPricesByCheckIn({});
      return;
    }

    const requestId = ++requestIdRef.current;
    loadedDatesRef.current = new Set();
    setPricesByCheckIn({});
    setSelectedCheckIn(stayDates[0]?.checkIn ?? "");

    void (async () => {
      for (const stay of stayDates) {
        if (requestIdRef.current !== requestId) return;
        await loadDatePrices(stay.checkIn, stay.checkOut);
      }
    })();
  }, [enabled, hidsKey, stayDates, loadDatePrices]);

  const dateStripItems = useMemo(() => {
    return stayDates.map((stay) => ({
      ...stay,
      minPrice: minPriceFromMap(pricesByCheckIn[stay.checkIn]),
      loading: loadingDates.has(stay.checkIn) && !pricesByCheckIn[stay.checkIn],
    }));
  }, [stayDates, pricesByCheckIn, loadingDates]);

  const selectedPrices = pricesByCheckIn[selectedCheckIn] ?? {};
  const selectedPricesReady = pricesByCheckIn[selectedCheckIn] !== undefined;
  const selectedLoading =
    loadingDates.has(selectedCheckIn) && pricesByCheckIn[selectedCheckIn] === undefined;

  return {
    stayDates: dateStripItems,
    selectedCheckIn,
    setSelectedCheckIn,
    selectedPrices,
    selectedPricesReady,
    selectedLoading,
  };
}
