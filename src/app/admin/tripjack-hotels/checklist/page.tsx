"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import {
  TripJackApiErrorPanel,
  type TripJackApiErrorDetails,
} from "@/components/admin/tripjack-api-error-panel";
import { tripjackAdminApiCall } from "@/lib/tripjack-hotels/admin-response";
import type { ProductionChecklistItem } from "@/lib/tripjack-hotels/production-checklist";

export default function TripJackHotelsChecklistPage() {
  const [items, setItems] = useState<ProductionChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<TripJackApiErrorDetails | null>(null);

  useEffect(() => {
    void (async () => {
      const result = await tripjackAdminApiCall<{ items: ProductionChecklistItem[] }>(
        "/api/admin/tripjack-hotels/checklist",
        undefined,
        "Load production checklist"
      );

      if (result.ok && result.data) {
        setItems(result.data.items ?? []);
      } else if (!result.ok) {
        setApiError({
          context: "Load production checklist",
          message: result.error ?? "Failed to load checklist",
          status: result.status,
          contentType: result.contentType,
          rawPreview: result.rawPreview,
        });
      }

      setLoading(false);
    })();
  }, []);

  return (
    <>
      <AdminHeader title="TripJack Hotels — Production Checklist" />
      <div className="p-6">
        <Link href="/admin/tripjack-hotels" className="text-sm text-primary hover:underline">
          ← Operations dashboard
        </Link>

        <div className="mt-4">
          <TripJackApiErrorPanel error={apiError} onDismiss={() => setApiError(null)} />
        </div>

        {loading ? (
          <Loader2 className="mt-8 h-6 w-6 animate-spin" />
        ) : (
          <ul className="mt-6 max-w-2xl space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-xl border p-4">
                {item.passed ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                )}
                <div>
                  <p className="font-medium">{item.label}</p>
                  {item.detail && <p className="text-sm text-muted-foreground">{item.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
