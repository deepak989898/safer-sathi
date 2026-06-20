"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Download, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { BookingsChart } from "@/components/admin/charts/bookings-chart";
import { RevenueChart } from "@/components/admin/charts/revenue-chart";
import { MetricCard } from "@/components/admin/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/i18n";
import type { AiAnalyticsSnapshot, AiReport } from "@/lib/ai-center/types";
import { toast } from "sonner";

export function AiCenterAnalyticsTab({
  actorRole,
  actorId,
  busy,
  setBusy,
}: {
  actorRole: string;
  actorId: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
}) {
  const [snapshot, setSnapshot] = useState<AiAnalyticsSnapshot | null>(null);
  const [reports, setReports] = useState<AiReport[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async (refresh = false) => {
    const params = new URLSearchParams({ actorRole, refresh: String(refresh) });
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const [analyticsRes, reportsRes] = await Promise.all([
      fetch(`/api/admin/ai-center/analytics?${params}`),
      fetch(`/api/admin/ai-center/reports?actorRole=${actorRole}`),
    ]);
    const [analyticsJson, reportsJson] = await Promise.all([
      analyticsRes.json(),
      reportsRes.json(),
    ]);
    if (analyticsJson.success) setSnapshot(analyticsJson.data.snapshot);
    if (reportsJson.success) setReports(reportsJson.data.reports ?? []);
  }, [actorRole, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = async () => {
    setBusy(true);
    try {
      await load(true);
      toast.success("Analytics refreshed");
    } finally {
      setBusy(false);
    }
  };

  const generateReport = async (period: "daily" | "weekly" | "monthly") => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-center/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, actorId, period }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`${period} report generated`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Report failed");
    } finally {
      setBusy(false);
    }
  };

  const download = (id: string, format: "csv" | "pdf") => {
    window.open(`/api/admin/ai-center/reports?actorRole=${actorRole}&id=${id}&format=${format}`, "_blank");
  };

  if (!snapshot) {
    return <div className="p-6 text-sm text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => void load(true)} disabled={busy}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Filter
        </Button>
        <Button onClick={() => void refresh()} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Refresh AI Insights
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Today" value={String(snapshot.todayBookings)} change="Bookings" changeType="neutral" icon={BarChart3} />
        <MetricCard title="This Week" value={String(snapshot.weeklyBookings)} change="Bookings" changeType="neutral" icon={BarChart3} />
        <MetricCard title="This Month" value={String(snapshot.monthlyBookings)} change="Bookings" changeType="neutral" icon={BarChart3} />
        <MetricCard title="Revenue" value={formatCurrency(snapshot.totalRevenue)} change="In range" changeType="neutral" icon={BarChart3} />
        <MetricCard title="Pending Payments" value={String(snapshot.pendingPayments)} change="Needs follow-up" changeType="neutral" icon={BarChart3} />
        <MetricCard title="Cancelled" value={String(snapshot.cancelledBookings)} change="Bookings" changeType="neutral" icon={BarChart3} />
        <MetricCard title="Refunds" value={String(snapshot.refundRequests)} change="Requests" changeType="neutral" icon={BarChart3} />
        <MetricCard title="Avg Booking" value={formatCurrency(snapshot.averageBookingValue)} change={`${snapshot.returningCustomers} returning`} changeType="neutral" icon={BarChart3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Revenue Chart</CardTitle></CardHeader>
          <CardContent><RevenueChart data={snapshot.revenueByMonth} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Booking Chart</CardTitle></CardHeader>
          <CardContent><BookingsChart data={snapshot.bookingsByMonth} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>AI Insights</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {snapshot.insights.map((ins) => (
            <div key={ins.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Badge variant={ins.impact === "high" ? "default" : "secondary"}>{ins.impact}</Badge>
                <span className="font-medium">{ins.title}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ins.insight}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            AI Reports
            <div className="flex flex-wrap gap-2">
              {(["daily", "weekly", "monthly"] as const).map((p) => (
                <Button key={p} size="sm" variant="outline" disabled={busy} onClick={() => void generateReport(p)}>
                  {p}
                </Button>
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString("en-IN")}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => download(r.id, "csv")}>
                  <Download className="mr-1 h-3 w-3" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => download(r.id, "pdf")}>
                  <Download className="mr-1 h-3 w-3" /> PDF
                </Button>
              </div>
            </div>
          ))}
          {reports.length === 0 && <p className="text-sm text-muted-foreground">Generate daily, weekly, or monthly reports.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
