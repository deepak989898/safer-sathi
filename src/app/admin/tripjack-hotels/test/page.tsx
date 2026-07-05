"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminApiFetch } from "@/lib/admin/api-client";
import { toast } from "sonner";

export default function TripJackHotelsTestPage() {
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  const run = async (test: string, payload?: Record<string, unknown>) => {
    setLoading(test);
    setResult(null);
    try {
      const res = await adminApiFetch("/api/admin/tripjack-hotels/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test, payload }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
      if (json.data?.warning) {
        toast.warning(String(json.data.warning));
      } else {
        toast.success(`${test} OK`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <AdminHeader title="TripJack Hotels — Test Panel" />
      <div className="space-y-4 p-6">
        <Link href="/admin/tripjack-hotels" className="text-sm text-primary hover:underline">
          ← Operations dashboard
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!!loading} onClick={() => void run("nationalities")}>
            {loading === "nationalities" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test nationalities
          </Button>
          <Button size="sm" variant="outline" disabled={!!loading} onClick={() => void run("listing")}>
            Test listing
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!loading}
            onClick={() => void run("static-hotels")}
          >
            Test static catalogue
          </Button>
        </div>
        <div className="flex max-w-md gap-2">
          <Input
            placeholder="TripJack bookingId"
            value={bookingId}
            onChange={(e) => setBookingId(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!!loading || !bookingId.trim()}
            onClick={() => void run("booking-details", { bookingId: bookingId.trim() })}
          >
            Test booking-details
          </Button>
        </div>
        {result != null && (
          <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </>
  );
}
