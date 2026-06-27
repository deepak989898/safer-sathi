"use client";

import { useEffect, useMemo, useState } from "react";
import { Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { customerApiFetch } from "@/lib/admin/api-client";
import { formatCurrency } from "@/lib/i18n";
import {
  MAX_REDEEM_PERCENT,
  MIN_REDEEM_POINTS,
  POINT_VALUE_INR,
} from "@/lib/rewards/constants";
import { cn } from "@/lib/utils";

interface RewardRedeemPanelProps {
  bookingAmount: number;
  value: number;
  onChange: (points: number) => void;
  className?: string;
}

export function RewardRedeemPanel({
  bookingAmount,
  value,
  onChange,
  className,
}: RewardRedeemPanelProps) {
  const [availablePoints, setAvailablePoints] = useState(0);
  const [maxPoints, setMaxPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingAmount <= 0) return;

    let cancelled = false;
    async function loadQuote() {
      setLoading(true);
      try {
        const res = await customerApiFetch("/api/customer/rewards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingAmount, pointsToRedeem: value || undefined }),
        });
        const json = await res.json();
        if (!cancelled && json.success) {
          const data = json.data as {
            availablePoints: number;
            maxRedeemablePoints: number;
            appliedPoints: number;
            canRedeem: boolean;
          };
          setAvailablePoints(data.availablePoints);
          setMaxPoints(data.maxRedeemablePoints);
          if (value === 0 && data.canRedeem && data.maxRedeemablePoints >= MIN_REDEEM_POINTS) {
            // Don't auto-apply — user opts in via checkbox
          }
        }
      } catch {
        if (!cancelled) {
          setAvailablePoints(0);
          setMaxPoints(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadQuote();
    return () => {
      cancelled = true;
    };
  }, [bookingAmount, value]);

  const discount = value * POINT_VALUE_INR;
  const payable = Math.max(1, bookingAmount - discount);
  const canRedeem = availablePoints >= MIN_REDEEM_POINTS && maxPoints >= MIN_REDEEM_POINTS;

  const helper = useMemo(() => {
    if (loading) return "Checking your reward balance...";
    if (!canRedeem) {
      if (availablePoints < MIN_REDEEM_POINTS) {
        return `You have ${availablePoints} points. Earn ${MIN_REDEEM_POINTS - availablePoints} more to redeem.`;
      }
      return `Max redeem on this booking: ${maxPoints} points (${Math.round(MAX_REDEEM_PERCENT * 100)}% cap).`;
    }
    return `Use up to ${maxPoints} points (₹${maxPoints} off). Min ${MIN_REDEEM_POINTS} points.`;
  }, [availablePoints, canRedeem, loading, maxPoints]);

  if (!loading && availablePoints === 0 && maxPoints === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Gift className="h-4 w-4 text-amber-600" />
          Redeem reward points
        </Label>
        <span className="text-xs text-muted-foreground">
          Balance: <strong>{availablePoints}</strong> pts
        </span>
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value > 0}
          disabled={!canRedeem}
          onChange={(event) => {
            if (!event.target.checked) {
              onChange(0);
              return;
            }
            onChange(Math.max(MIN_REDEEM_POINTS, maxPoints));
          }}
          className="rounded border-input"
        />
        Apply reward points to this booking
      </label>

      {value > 0 && canRedeem && (
        <div className="space-y-2">
          <Input
            type="number"
            min={MIN_REDEEM_POINTS}
            max={maxPoints}
            step={1}
            value={value}
            onChange={(e) => {
              const next = Math.floor(Number(e.target.value) || 0);
              onChange(Math.min(maxPoints, Math.max(0, next)));
            }}
          />
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            −{formatCurrency(discount)} discount · Pay {formatCurrency(payable)}
          </p>
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}
