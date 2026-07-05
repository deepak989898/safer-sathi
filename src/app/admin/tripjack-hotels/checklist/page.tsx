"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { adminApiFetch } from "@/lib/admin/api-client";
import type { ProductionChecklistItem } from "@/lib/tripjack-hotels/production-checklist";

export default function TripJackHotelsChecklistPage() {
  const [items, setItems] = useState<ProductionChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await adminApiFetch("/api/admin/tripjack-hotels/checklist");
      const json = await res.json();
      if (json.success) setItems(json.data.items ?? []);
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
