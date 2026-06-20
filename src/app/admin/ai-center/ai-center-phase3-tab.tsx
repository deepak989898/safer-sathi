"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Loader2,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trash2,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/i18n";
import type {
  AiRatingRecord,
  BlockedUserRecord,
  FraudLogRecord,
  LeadScoreRecord,
  Phase3Stats,
  PriceRule,
  PricingHistoryRecord,
} from "@/lib/ai-center/types";
import type { ReviewAnalysis } from "@/lib/ai-center/review-agent";
import { toast } from "sonner";

export function AiCenterPhase3Tab({
  actorRole,
  actorId,
  busy,
  setBusy,
  defaultSubTab = "pricing",
}: {
  actorRole: string;
  actorId: string;
  busy: boolean;
  setBusy: (v: boolean) => void;
  defaultSubTab?: "pricing" | "reviews" | "leads" | "fraud";
}) {
  const [subTab, setSubTab] = useState(defaultSubTab);
  const [stats, setStats] = useState<Phase3Stats | null>(null);
  const [pricing, setPricing] = useState<PricingHistoryRecord[]>([]);
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [ratings, setRatings] = useState<AiRatingRecord[]>([]);
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null);
  const [leads, setLeads] = useState<LeadScoreRecord[]>([]);
  const [fraud, setFraud] = useState<FraudLogRecord[]>([]);
  const [blocked, setBlocked] = useState<BlockedUserRecord[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/ai-center/phase3?actorRole=${actorRole}`);
    const json = await res.json();
    if (json.success) {
      setStats(json.data.stats);
      setPricing(json.data.pricing ?? []);
      setRules(json.data.rules ?? []);
      setRatings(json.data.ratings ?? []);
      setAnalysis(json.data.reviewAnalysis ?? null);
      setLeads(json.data.leads ?? []);
      setFraud(json.data.fraud ?? []);
      setBlocked(json.data.blocked ?? []);
    }
  }, [actorRole]);

  useEffect(() => {
    void load();
  }, [load]);

  const pricingAction = async (id: string, action: "approve" | "reject", overridePrice?: number) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ai-center/phase3/pricing/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, actorId, action, overridePrice }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Price ${action}d`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const reviewAction = async (
    id: string,
    action: "approve" | "hide" | "reply" | "delete",
    adminReply?: string
  ) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ai-center/phase3/reviews/${id}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, actorId, action, adminReply }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Review ${action}`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  const unblockUser = async (blockedId: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ai-center/phase3/fraud/${blockedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, actorId, action: "unblock", blockedUserId: blockedId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("User unblocked");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  const fraudResolve = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ai-center/phase3/fraud/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, actorId, action: "resolve" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Fraud alert resolved");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const runPricingScan = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-center/phase3/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, actorId, action: "scan" }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Generated ${json.data.count} pricing suggestions`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  };

  const updateRule = async (ruleId: string, updates: Partial<PriceRule>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-center/phase3/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, actorId, action: "update_rule", ruleId, ruleUpdates: updates }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success("Price rule updated");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {stats && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Pricing pending: {stats.pricingPending}</Badge>
          <Badge variant="outline">Reviews pending: {stats.reviewsPending}</Badge>
          <Badge variant="outline">Hot leads: {stats.hotLeads}</Badge>
          <Badge variant="outline">Fraud open: {stats.fraudOpen}</Badge>
          <Badge variant="outline">Blocked: {stats.blockedUsers}</Badge>
        </div>
      )}

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="pricing">Dynamic Pricing</TabsTrigger>
          <TabsTrigger value="reviews">Reviews & Ratings</TabsTrigger>
          <TabsTrigger value="leads">Lead Scoring</TabsTrigger>
          <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                AI Dynamic Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                AI optimizes prices based on season, demand, weekends, festivals, occupancy & availability.
              </p>
              <Button onClick={() => void runPricingScan()} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Run Pricing Scan
              </Button>
              <div className="grid gap-3 md:grid-cols-2">
                {rules.map((rule) => (
                  <div key={rule.id} className="rounded-lg border p-3 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{rule.entityType}</span>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(v) => void updateRule(rule.id, { enabled: v })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Min %</Label>
                        <Input
                          type="number"
                          value={rule.minPricePercent}
                          onChange={(e) =>
                            void updateRule(rule.id, { minPricePercent: Number(e.target.value) || 75 })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Max %</Label>
                        <Input
                          type="number"
                          value={rule.maxPricePercent}
                          onChange={(e) =>
                            void updateRule(rule.id, { maxPricePercent: Number(e.target.value) || 135 })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <PricingTable pricing={pricing} busy={busy} onApprove={pricingAction} onReject={pricingAction} />
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          {analysis && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Avg Rating</p><p className="text-2xl font-bold">{analysis.averageRating}★</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Reviews</p><p className="text-2xl font-bold">{analysis.reviewCount}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Top Hotel</p><p className="font-medium">{analysis.mostLovedHotel ?? "—"}</p></CardContent></Card>
              <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Top Destination</p><p className="font-medium">{analysis.mostLovedDestination ?? "—"}</p></CardContent></Card>
            </div>
          )}
          <ReviewsTable
            ratings={ratings}
            busy={busy}
            replyText={replyText}
            setReplyText={setReplyText}
            onAction={reviewAction}
          />
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Lead Scoring</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">Lead</th>
                    <th className="p-2 text-left">Score</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">AI Suggestion</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b">
                      <td className="p-2">
                        <p className="font-medium">{lead.name ?? lead.email ?? lead.sessionId.slice(0, 12)}</p>
                        <p className="text-xs text-muted-foreground">{lead.signals.lastDestination ?? "—"}</p>
                      </td>
                      <td className="p-2 font-bold">{lead.score}</td>
                      <td className="p-2"><StatusBadge status={lead.status} /></td>
                      <td className="p-2 text-muted-foreground">{lead.aiSuggestion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leads.length === 0 && <p className="p-4 text-sm text-muted-foreground">No leads tracked yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraud" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5" />Fraud Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fraud.map((f) => (
                <div key={f.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{f.email ?? f.phone ?? f.userId}</p>
                      <p className="text-xs text-muted-foreground">{f.recommendedAction}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={f.riskLevel === "high" || f.riskLevel === "critical" ? "destructive" : "secondary"}>
                        {f.riskLevel} ({f.riskScore})
                      </Badge>
                      <StatusBadge status={f.status} />
                      {f.status !== "resolved" && (
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => void fraudResolve(f.id)}>
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {fraud.length === 0 && <p className="text-sm text-muted-foreground">No fraud alerts.</p>}
            </CardContent>
          </Card>
          {blocked.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Blocked Users</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {blocked.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <span>{b.email ?? b.phone ?? b.userId}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void unblockUser(b.id)}
                    >
                      Unblock
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PricingTable({
  pricing,
  busy,
  onApprove,
  onReject,
}: {
  pricing: PricingHistoryRecord[];
  busy: boolean;
  onApprove: (id: string, action: "approve" | "reject", price?: number) => void;
  onReject: (id: string, action: "approve" | "reject") => void;
}) {
  const pending = pricing.filter((p) => p.status === "pending");
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="p-2 text-left">Item</th>
            <th className="p-2 text-left">Old</th>
            <th className="p-2 text-left">Suggested</th>
            <th className="p-2 text-left">Reason</th>
            <th className="p-2 text-left">Status</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pricing.slice(0, 30).map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2">
                <p className="font-medium">{p.entityName}</p>
                <p className="text-xs capitalize text-muted-foreground">{p.entityType}</p>
              </td>
              <td className="p-2">{formatCurrency(p.oldPrice)}</td>
              <td className="p-2 font-semibold text-primary">{formatCurrency(p.suggestedPrice)}</td>
              <td className="p-2 text-xs text-muted-foreground">{p.reason}</td>
              <td className="p-2"><StatusBadge status={p.status} /></td>
              <td className="p-2">
                {p.status === "pending" && (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" disabled={busy} onClick={() => onApprove(p.id, "approve")}><Check className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => onReject(p.id, "reject")}><X className="h-3 w-3" /></Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pending.length === 0 && pricing.length === 0 && (
        <p className="p-4 text-center text-sm text-muted-foreground">Run pricing scan to generate suggestions.</p>
      )}
    </div>
  );
}

function ReviewsTable({
  ratings,
  busy,
  replyText,
  setReplyText,
  onAction,
}: {
  ratings: AiRatingRecord[];
  busy: boolean;
  replyText: Record<string, string>;
  setReplyText: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onAction: (id: string, action: "approve" | "hide" | "reply" | "delete", reply?: string) => void;
}) {
  return (
    <div className="space-y-3">
      {ratings.slice(0, 20).map((r) => (
        <div key={r.id} className="rounded-lg border p-3 text-sm space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {r.rating} — {r.userName}
              </p>
              <p className="text-xs text-muted-foreground">{r.serviceName}</p>
            </div>
            <StatusBadge status={r.status} />
          </div>
          <p className="text-muted-foreground">{r.review}</p>
          {r.aiSummary && <p className="text-xs italic">{r.aiSummary}</p>}
          {r.adminReply && <p className="text-xs bg-muted p-2 rounded">Reply: {r.adminReply}</p>}
          <div className="flex flex-wrap gap-2">
            {r.status === "pending" && (
              <Button size="sm" disabled={busy} onClick={() => onAction(r.id, "approve")}>Approve</Button>
            )}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction(r.id, "hide")}>Hide</Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction(r.id, "delete")}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Textarea
              rows={1}
              placeholder="Admin reply..."
              value={replyText[r.id] ?? ""}
              onChange={(e) => setReplyText((s) => ({ ...s, [r.id]: e.target.value }))}
            />
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction(r.id, "reply", replyText[r.id])}>
              Reply
            </Button>
          </div>
        </div>
      ))}
      {ratings.length === 0 && <p className="text-sm text-muted-foreground">No reviews yet.</p>}
    </div>
  );
}
