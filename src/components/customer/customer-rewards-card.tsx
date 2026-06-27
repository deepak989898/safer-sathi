"use client";

import { useEffect, useState } from "react";
import { Gift, History, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { customerApiFetch } from "@/lib/admin/api-client";
import { formatCurrency } from "@/lib/i18n";
import {
  MAX_REDEEM_PERCENT,
  MIN_REDEEM_POINTS,
  POINT_VALUE_INR,
} from "@/lib/rewards/constants";
import type { RewardTransaction } from "@/types";

interface RewardsData {
  rewardPoints: number;
  lifetimeRewardPoints: number;
  transactions: RewardTransaction[];
  rules?: {
    earnRate: string;
    pointValue: string;
    minRedeem: number;
    maxRedeemPercent: number;
  };
}

export function CustomerRewardsCard() {
  const [data, setData] = useState<RewardsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await customerApiFetch("/api/customer/rewards");
        const json = await res.json();
        if (!cancelled && json.success) {
          setData(json.data as RewardsData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="mb-8 border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gift className="size-5 text-amber-600" />
          Safar Sathi Rewards
        </CardTitle>
        <CardDescription>
          Earn points on every paid booking and redeem up to {Math.round(MAX_REDEEM_PERCENT * 100)}%
          off your next trip.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading rewards...</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Available points
                </p>
                <p className="mt-1 text-3xl font-bold text-amber-700 dark:text-amber-400">
                  {data?.rewardPoints ?? 0}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Worth up to {formatCurrency((data?.rewardPoints ?? 0) * POINT_VALUE_INR)}
                </p>
              </div>
              <div className="rounded-xl border bg-background/80 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Lifetime earned
                </p>
                <p className="mt-1 text-3xl font-bold text-[#0c2444] dark:text-foreground">
                  {data?.lifetimeRewardPoints ?? 0}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  {data?.rules?.earnRate ?? "Earn on every confirmed booking"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border bg-background/60 p-3 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">How it works:</strong> Get reward points after
                payment is confirmed. Redeem {MIN_REDEEM_POINTS}+ points on your next booking (max{" "}
                {Math.round(MAX_REDEEM_PERCENT * 100)}% of trip value). 1 point = ₹{POINT_VALUE_INR}{" "}
                discount.
              </p>
            </div>

            {data && data.transactions.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <History className="h-4 w-4" />
                  Recent activity
                </p>
                <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                  {data.transactions.map((tx) => (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between gap-2 rounded-md border bg-background/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium capitalize">{tx.type}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {tx.note ?? tx.bookingNumber ?? "—"}
                        </p>
                      </div>
                      <Badge
                        variant={tx.points >= 0 ? "default" : "secondary"}
                        className="shrink-0"
                      >
                        {tx.points >= 0 ? "+" : ""}
                        {tx.points}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
