"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Shield,
  Wifi,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { adminApiFetch } from "@/lib/admin/api-client";
import type { TripJackHotelOpsDashboard } from "@/lib/tripjack-hotels/ops-dashboard";
import type { ProductionChecklistItem } from "@/lib/tripjack-hotels/production-checklist";
import type { TripJackHotelSyncLog } from "@/lib/tripjack-hotels/catalog-types";
import type { ProxyRouteTestResult } from "@/lib/tripjack-hotels/proxy-types";
import { TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE } from "@/lib/tripjack-hotels/messages";
import { formatCurrency } from "@/lib/i18n";
import { toast } from "sonner";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs uppercase text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function TripJackHotelsAdminClient() {
  const [dashboard, setDashboard] = useState<TripJackHotelOpsDashboard | null>(null);
  const [logs, setLogs] = useState<TripJackHotelSyncLog[]>([]);
  const [checklist, setChecklist] = useState<ProductionChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [proxyTesting, setProxyTesting] = useState(false);
  const [proxyTests, setProxyTests] = useState<ProxyRouteTestResult[] | null>(null);
  const [proxyBaseUrl, setProxyBaseUrl] = useState<string | null>(null);
  const [proxyMessage, setProxyMessage] = useState<string | null>(null);
  const [staticCatalogueBlocked, setStaticCatalogueBlocked] = useState(false);
  const [manualLabel, setManualLabel] = useState("");
  const [manualHids, setManualHids] = useState("");
  const [manualAliases, setManualAliases] = useState("");
  const [manualDestinations, setManualDestinations] = useState<
    Array<{ id: string; label: string; hids: number[]; searchKeys: string[] }>
  >([]);
  const [manualSaving, setManualSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, syncRes, checkRes] = await Promise.all([
        adminApiFetch("/api/admin/tripjack-hotels/dashboard"),
        adminApiFetch("/api/admin/tripjack-hotels/sync"),
        adminApiFetch("/api/admin/tripjack-hotels/checklist"),
      ]);
      const dashJson = await dashRes.json();
      const syncJson = await syncRes.json();
      const checkJson = await checkRes.json();
      if (dashJson.success) {
        setDashboard(dashJson.data.dashboard);
        setLiveEnabled(Boolean(dashJson.data.dashboard?.environment?.liveBookingEnabled));
      }
      if (syncJson.success) setLogs(syncJson.data.logs ?? []);
      if (checkJson.success) setChecklist(checkJson.data.items ?? []);
      const manualRes = await adminApiFetch("/api/admin/tripjack-hotels/manual-destinations");
      const manualJson = await manualRes.json();
      if (manualJson.success) {
        setManualDestinations(manualJson.data.destinations ?? []);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runSync = async (mode: string) => {
    setSyncing(mode);
    try {
      const res = await adminApiFetch(`/api/admin/tripjack-hotels/sync?mode=${mode}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        const details = json.details as
          | {
              upstreamUrl?: string;
              upstreamStatus?: number;
              rawPreview?: string;
              adminMessage?: string;
              proxyRouteOk?: boolean;
              bookingFlowUnblocked?: boolean;
            }
          | undefined;
        const parts = [details?.adminMessage ?? json.error ?? "Sync failed"];
        if (details?.bookingFlowUnblocked) {
          parts.push("VPS proxy is OK — hotel search/booking can still work with manual HID override");
        }
        if (details?.upstreamUrl) {
          parts.push(`upstream ${details.upstreamStatus ?? "?"} @ ${details.upstreamUrl}`);
        }
        if (details?.rawPreview) {
          parts.push(details.rawPreview.slice(0, 200));
        }
        throw new Error(parts.join(" — "));
      }
      toast.success(json.data.message ?? "Sync completed");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const runProxyTests = async () => {
    setProxyTesting(true);
    try {
      const res = await adminApiFetch("/api/admin/tripjack-hotels/proxy-test", { method: "POST" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Proxy test failed");
      setProxyTests(json.data.results ?? []);
      setProxyBaseUrl(json.data.proxyBaseUrl ?? null);
      setProxyMessage(json.data.message ?? null);
      setStaticCatalogueBlocked(Boolean(json.data.staticCatalogueBlocked));
      if (json.data.allOk) {
        toast.success(json.data.message ?? "VPS proxy route tests passed");
      } else {
        toast.error(json.data.message ?? "Some VPS proxy routes failed — see results below");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Proxy test failed");
    } finally {
      setProxyTesting(false);
    }
  };

  const saveManualDestination = async () => {
    setManualSaving(true);
    try {
      const hids = manualHids
        .split(/[,\s]+/)
        .map((value) => Number(value.trim()))
        .filter((value) => value > 0);
      const searchKeys = manualAliases
        .split(/[,\n]+/)
        .map((value) => value.trim())
        .filter(Boolean);
      const res = await adminApiFetch("/api/admin/tripjack-hotels/manual-destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: manualLabel.trim(), hids, searchKeys }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Save failed");
      toast.success(`Saved ${manualLabel.trim()}`);
      setManualLabel("");
      setManualHids("");
      setManualAliases("");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setManualSaving(false);
    }
  };

  const proxyStatus = (name: string) => proxyTests?.find((row) => row.name === name);

  const apiStatusRows = [
    { key: "health", label: "Proxy health", names: ["health", "root"] },
    { key: "nationalities", label: "Nationalities", names: ["nationalities"] },
    { key: "listing", label: "Dynamic listing", names: ["listing"] },
    { key: "pricing", label: "Pricing", names: ["pricing"] },
    { key: "review", label: "Review", names: ["review"] },
    { key: "static-mapping", label: "Hotel mapping", names: ["hotel-mapping"] },
    { key: "static-content", label: "Hotel content", names: ["hotel-content"] },
  ] as const;

  const toggleLive = async () => {
    try {
      const res = await adminApiFetch("/api/admin/tripjack-hotels/env", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ liveBookingEnabled: !liveEnabled }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setLiveEnabled(Boolean(json.data.ops?.liveBookingEnabled));
      toast.success(json.data.ops?.liveBookingEnabled ? "Live booking enabled" : "Live booking disabled");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const env = dashboard?.environment;

  return (
    <>
      <AdminHeader title="TripJack Hotels — Operations" />
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            className={
              env?.environment === "production"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }
          >
            {env?.environment === "production" ? "LIVE HMS" : "STAGING HMS"}
          </Badge>
          {env?.razorpayLive && <Badge variant="outline">Razorpay Live</Badge>}
          {env?.liveBookingAllowed && (
            <Badge className="bg-emerald-100 text-emerald-800">Bookings Allowed</Badge>
          )}
          <Link href="/admin/hotel-bookings" className="text-sm text-primary hover:underline">
            Hotel bookings →
          </Link>
          <Link href="/admin/tripjack-hotels/checklist" className="text-sm text-primary hover:underline">
            Production checklist →
          </Link>
          <Link href="/admin/tripjack-hotels/test" className="text-sm text-primary hover:underline">
            Test panel →
          </Link>
          <Link href="/admin/tripjack-hotels/logs" className="text-sm text-primary hover:underline">
            API logs →
          </Link>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {dashboard && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Today bookings" value={dashboard.todayBookings} />
            <Stat label="Today revenue" value={formatCurrency(dashboard.todayRevenue, "en")} />
            <Stat label="Refund pending" value={dashboard.refundPending} />
            <Stat label="Voucher pending" value={dashboard.voucherPending} />
            <Stat label="Failed / review" value={dashboard.failedBookings} />
            <Stat label="Cancellations" value={dashboard.cancellationRequests} />
            <Stat label="API errors today" value={dashboard.apiErrorsToday} />
            <Stat label="Active hotels" value={dashboard.catalogMeta.activeHotels ?? 0} />
          </div>
        )}

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Catalog & status sync</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Last catalog sync: {dashboard?.catalogMeta.lastSyncedAt ?? "Never"} · Mapping IDs:{" "}
              {dashboard?.catalogMeta.totalMappingIds ?? 0} · Content ok/failed:{" "}
              {dashboard?.catalogMeta.contentSuccessCount ?? 0}/{dashboard?.catalogMeta.contentFailedCount ?? 0}{" "}
              · Last booking sync: {dashboard?.catalogMeta.lastBookingStatusSyncAt ?? "Never"}
            </p>
            {dashboard?.catalogMeta.lastSyncMessage ? (
              <p className="text-sm text-muted-foreground">{dashboard.catalogMeta.lastSyncMessage}</p>
            ) : null}
            {staticCatalogueBlocked && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {TRIPJACK_STATIC_CATALOGUE_403_ADMIN_MESSAGE}
              </div>
            )}
            {proxyTests && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {apiStatusRows.map((row) => {
                  const match =
                    row.names.map((name) => proxyStatus(name)).find(Boolean) ?? null;
                  const ok = match?.ok || Boolean(match?.warning);
                  const blocked = Boolean(match?.warning);
                  return (
                    <div key={row.key} className="rounded-lg border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{row.label}</span>
                        <Badge variant={blocked ? "outline" : ok ? "secondary" : "destructive"}>
                          {blocked ? "TRIPJACK BLOCKED" : ok ? "OK" : "FAIL"}
                        </Badge>
                      </div>
                      {match?.upstreamStatus != null ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          upstream {match.upstreamStatus}
                          {match.upstreamUrl ? ` · ${match.upstreamUrl}` : ""}
                        </p>
                      ) : null}
                      {match?.warning ? (
                        <p className="mt-1 text-xs text-amber-700">{match.warning}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {[
                ["full", "Sync mapping + content"],
                ["mapping_only", "Sync mapping only"],
                ["content_only", "Sync content only"],
                ["incremental", "Incremental sync"],
                ["nationalities", "Sync nationalities"],
                ["booking_status", "Sync booking status"],
              ].map(([mode, label]) => (
                <Button
                  key={mode}
                  size="sm"
                  variant="outline"
                  disabled={syncing === mode}
                  onClick={() => void runSync(mode)}
                >
                  {syncing === mode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Test VPS proxy routes</h2>
              </div>
              <Button size="sm" variant="outline" disabled={proxyTesting} onClick={() => void runProxyTests()}>
                {proxyTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Run proxy tests
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Tests health, nationalities, V3 static mapping/content, and listing/pricing/review via
              server → VPS proxy.
              {proxyBaseUrl ? ` Proxy: ${proxyBaseUrl}` : null}
            </p>
            {proxyMessage ? (
              <p className="text-sm text-muted-foreground">{proxyMessage}</p>
            ) : null}
            {proxyTests && (
              <div className="space-y-2">
                {proxyTests.map((row) => (
                  <div
                    key={row.name}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.name}</span>
                      <Badge
                        variant={
                          row.warning ? "outline" : row.ok ? "secondary" : "destructive"
                        }
                      >
                        {row.warning ? "TRIPJACK BLOCKED" : row.ok ? "OK" : "FAIL"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {row.method} HTTP {row.httpStatus}
                        {row.upstreamStatus != null ? ` · upstream ${row.upstreamStatus}` : ""}
                        {row.proxyRouteOk ? " · proxy route OK" : ""}
                      </span>
                    </div>
                    <p className="mt-1 break-all text-xs text-muted-foreground">{row.proxyUrl}</p>
                    {row.upstreamUrl && row.upstreamUrl !== row.proxyUrl ? (
                      <p className="break-all text-xs text-muted-foreground">→ {row.upstreamUrl}</p>
                    ) : null}
                    {row.warning ? (
                      <p className="mt-1 text-xs text-amber-700">{row.warning}</p>
                    ) : null}
                    {row.error && !row.warning ? (
                      <p className="mt-1 text-xs text-red-600">{row.error}</p>
                    ) : null}
                    <pre className="mt-2 max-h-24 overflow-auto rounded bg-muted/50 p-2 text-xs">
                      {row.preview || "(empty response)"}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <h2 className="font-semibold">Manual destination → hotel IDs</h2>
            <p className="text-sm text-muted-foreground">
              Use when static catalogue is blocked (403). Customers search by city name; hotel IDs
              stay hidden. Example: Goa → comma-separated TripJack HIDs.
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="City label (e.g. Goa)"
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
              />
              <Input
                placeholder="HIDs: 12345, 67890"
                value={manualHids}
                onChange={(e) => setManualHids(e.target.value)}
              />
              <Input
                placeholder="Aliases: goa, north goa"
                value={manualAliases}
                onChange={(e) => setManualAliases(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={manualSaving || !manualLabel.trim() || !manualHids.trim()}
              onClick={() => void saveManualDestination()}
            >
              {manualSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save manual destination
            </Button>
            {manualDestinations.length > 0 ? (
              <div className="space-y-2">
                {manualDestinations.map((dest) => (
                  <div key={dest.id} className="rounded-lg border px-3 py-2 text-sm">
                    <p className="font-medium">{dest.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {dest.hids.length} HIDs · aliases: {dest.searchKeys.join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Live mode</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              HMS: {env?.baseUrl} · Proxy: {env?.proxyBaseUrl}
            </p>
            <Button size="sm" variant={liveEnabled ? "destructive" : "default"} onClick={() => void toggleLive()}>
              {liveEnabled ? "Disable live booking" : "Enable live booking"}
            </Button>
          </CardContent>
        </Card>

        {checklist.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 font-semibold">Production readiness</h2>
              <ul className="space-y-2">
                {checklist.map((item) => (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    {item.passed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
                    )}
                    <span>
                      {item.label}
                      {item.detail ? (
                        <span className="block text-xs text-muted-foreground">{item.detail}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {logs.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-4 font-semibold">Recent sync logs</h2>
              <div className="space-y-2">
                {logs.slice(0, 8).map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{log.mode}</span>
                    <Badge variant={log.success ? "secondary" : "destructive"}>
                      {log.success ? "OK" : "Failed"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{log.startedAt}</span>
                    <span className="text-xs">
                      +{log.hotelsUpserted} hotels · {log.nationalitiesSynced ?? 0} nat
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">Hotel search (customer)</p>
              <Link href="/hotels/search" className="text-sm text-primary hover:underline">
                Open search page →
              </Link>
            </div>
            <Activity className="ml-auto h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
