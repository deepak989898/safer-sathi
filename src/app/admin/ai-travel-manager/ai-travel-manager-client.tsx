"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  Building2,
  Car,
  Check,
  Globe,
  Loader2,
  MessageSquare,
  Package,
  Pencil,
  RefreshCw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { normalizePackageDraft, resolveApprovalStatus } from "@/lib/ai-travel-manager/draft-utils";
import {
  canAnalyzeCompetitors,
  canApproveAIContent,
  canEditAIDraft,
  canGenerateAIContent,
  canRecommendApproval,
  canRejectAIDraft,
  canUseAIChatCommands,
  canViewCompetitorData,
} from "@/lib/ai-travel-manager/permissions";
import {
  loadLocalPackageDrafts,
  mergePackageDrafts,
  saveLocalPackageDraft,
  syncLocalPackageDrafts,
} from "@/lib/ai-travel-manager/client-cache";
import type {
  AICompetitorData,
  AIHotelDraft,
  AIPackageDraft,
  AITravelManagerStats,
  AIVehicleDraft,
} from "@/lib/ai-travel-manager/types";
import { formatCurrency, localizedText } from "@/lib/i18n";
import { toast } from "sonner";

interface DraftsData {
  competitors: AICompetitorData[];
  packages: AIPackageDraft[];
  vehicles: AIVehicleDraft[];
  hotels: AIHotelDraft[];
}

const AI_TRAVEL_MANAGER_TABS = new Set([
  "dashboard",
  "competitors",
  "packages",
  "vehicles",
  "hotels",
  "chat",
]);

export default function AITravelManagerClient() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && AI_TRAVEL_MANAGER_TABS.has(tabFromUrl) ? tabFromUrl : "dashboard"
  );

  useEffect(() => {
    if (tabFromUrl && AI_TRAVEL_MANAGER_TABS.has(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const { user } = useAuth();
  const actorRole = user?.role ?? "customer";
  const actorId = user?.id || user?.email || "admin";

  const [stats, setStats] = useState<AITravelManagerStats | null>(null);
  const [drafts, setDrafts] = useState<DraftsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [competitorUrl, setCompetitorUrl] = useState("");
  const [competitorName, setCompetitorName] = useState("");
  const [destinationHint, setDestinationHint] = useState("Goa");

  const [pkgDestination, setPkgDestination] = useState("Goa");
  const [pkgDays, setPkgDays] = useState("6");
  const [selectedCompetitorId, setSelectedCompetitorId] = useState("");
  const [inlineCompetitorUrl, setInlineCompetitorUrl] = useState("");
  const [inlineCompetitorName, setInlineCompetitorName] = useState("");

  const [vehicleName, setVehicleName] = useState("Toyota Innova Crysta");
  const [hotelCity, setHotelCity] = useState("Goa");

  const [chatInput, setChatInput] = useState("");
  const [chatReply, setChatReply] = useState("");

  const [editingPackage, setEditingPackage] = useState<AIPackageDraft | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDuration, setEditDuration] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, draftsRes] = await Promise.all([
        fetch(`/api/ai/travel-manager/dashboard?actorRole=${actorRole}`),
        fetch(`/api/ai/travel-manager/drafts?actorRole=${actorRole}`),
      ]);
      const statsJson = await statsRes.json();
      const draftsJson = await draftsRes.json();
      if (!statsJson.success) {
        throw new Error(statsJson.error ?? "Failed to load dashboard");
      }
      if (!draftsJson.success) {
        throw new Error(draftsJson.error ?? "Failed to load drafts");
      }
      setStats(statsJson.data);
      const mergedPackages = mergePackageDrafts(
        draftsJson.data.packages ?? [],
        loadLocalPackageDrafts()
      ).map(normalizePackageDraft);
      setDrafts({
        ...draftsJson.data,
        packages: mergedPackages,
      });
      syncLocalPackageDrafts(mergedPackages);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load AI Travel Manager data"
      );
    } finally {
      setLoading(false);
    }
  }, [actorRole]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateLocalPackage = (pkg: AIPackageDraft) => {
    const normalized = normalizePackageDraft(pkg);
    saveLocalPackageDraft(normalized);
    setDrafts((prev) => ({
      competitors: prev?.competitors ?? [],
      vehicles: prev?.vehicles ?? [],
      hotels: prev?.hotels ?? [],
      packages: mergePackageDrafts([normalized], prev?.packages ?? []).map(
        normalizePackageDraft
      ),
    }));
  };

  const draftAction = async (
    type: "package" | "vehicle" | "hotel",
    id: string,
    action: "recommend" | "approve" | "reject" | "regenerate",
    fallbackDraft?: AIPackageDraft
  ) => {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/ai/travel-manager/drafts/${type}/${id}?action=${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorRole,
            actorId,
            ...(type === "package" && fallbackDraft
              ? { fallbackDraft }
              : {}),
          }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Action failed");
      if (type === "package" && json.data) {
        updateLocalPackage(json.data as AIPackageDraft);
      }
      toast.success(
        action === "approve"
          ? "Package approved and published on website"
          : `Draft ${action} successful`
      );
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const openPackageEdit = (pkg: AIPackageDraft) => {
    setEditingPackage(normalizePackageDraft(pkg));
    setEditTitle(localizedText(pkg.title, "en"));
    setEditPrice(String(pkg.price));
    setEditDescription(localizedText(pkg.description, "en"));
    setEditDuration(String(pkg.duration));
  };

  const savePackageEdit = async () => {
    if (!editingPackage) return;
    setBusy(true);
    try {
      const updates = {
        title: { en: editTitle, hi: editTitle },
        price: Number(editPrice) || editingPackage.price,
        duration: Number(editDuration) || editingPackage.duration,
        description: { en: editDescription, hi: editDescription },
        durationLabel: {
          en: `${Math.max(Number(editDuration) - 1, 0)} Nights / ${editDuration} Days`,
          hi: `${Math.max(Number(editDuration) - 1, 0)} रात / ${editDuration} दिन`,
        },
      };
      const res = await fetch(
        `/api/ai/travel-manager/drafts/package/${editingPackage.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorRole,
            actorId,
            updates,
            fallbackDraft: editingPackage,
          }),
        }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Update failed");
      updateLocalPackage(json.data as AIPackageDraft);
      toast.success("Package draft updated");
      setEditingPackage(null);
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const analyzeCompetitor = async () => {
    if (!canAnalyzeCompetitors(actorRole)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/travel-manager/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          websiteUrl: competitorUrl,
          websiteName: competitorName,
          destinationHint,
          analyzedBy: actorId,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Analysis failed");
      toast.success("Competitor website analyzed");
      setCompetitorUrl("");
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  };

  const generatePackage = async () => {
    if (!canGenerateAIContent(actorRole)) return;
    setBusy(true);
    try {
      let competitorId = selectedCompetitorId || undefined;

      if (
        canAnalyzeCompetitors(actorRole) &&
        inlineCompetitorUrl.trim() &&
        !competitorId
      ) {
        const analyzeRes = await fetch("/api/ai/travel-manager/competitors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actorRole,
            websiteUrl: inlineCompetitorUrl.trim(),
            websiteName:
              inlineCompetitorName.trim() ||
              new URL(
                inlineCompetitorUrl.trim().startsWith("http")
                  ? inlineCompetitorUrl.trim()
                  : `https://${inlineCompetitorUrl.trim()}`
              ).hostname,
            destinationHint: pkgDestination,
            analyzedBy: actorId,
          }),
        });
        const analyzeJson = await analyzeRes.json();
        if (!analyzeJson.success) {
          throw new Error(analyzeJson.error ?? "Competitor analysis failed");
        }
        competitorId = analyzeJson.data.id;
      }

      const res = await fetch("/api/ai/travel-manager/packages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          destination: pkgDestination,
          durationDays: Number(pkgDays) || 6,
          competitorId,
          createdBy: actorId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        const detail =
          typeof json.details === "object"
            ? JSON.stringify(json.details)
            : json.details;
        throw new Error(
          [json.error, detail].filter(Boolean).join(" — ") || "Generation failed"
        );
      }
      toast.success("Package draft created — scroll down to review it");
      const created = json.data as AIPackageDraft;
      saveLocalPackageDraft(created);
      setDrafts((prev) => ({
        competitors: prev?.competitors ?? [],
        vehicles: prev?.vehicles ?? [],
        hotels: prev?.hotels ?? [],
        packages: mergePackageDrafts(
          [created],
          prev?.packages ?? loadLocalPackageDrafts()
        ),
      }));
      setInlineCompetitorUrl("");
      setInlineCompetitorName("");
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const generateVehicle = async () => {
    if (!canGenerateAIContent(actorRole)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/travel-manager/vehicles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          name: vehicleName,
          createdBy: actorId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        const detail =
          typeof json.details === "object"
            ? JSON.stringify(json.details)
            : json.details;
        throw new Error(
          [json.error, detail].filter(Boolean).join(" — ") || "Generation failed"
        );
      }
      toast.success("Vehicle draft created");
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const generateHotel = async () => {
    if (!canGenerateAIContent(actorRole)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/travel-manager/hotels/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          city: hotelCity,
          createdBy: actorId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        const detail =
          typeof json.details === "object"
            ? JSON.stringify(json.details)
            : json.details;
        throw new Error(
          [json.error, detail].filter(Boolean).join(" — ") || "Generation failed"
        );
      }
      toast.success("Hotel draft created");
      loadAll();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  const sendChat = async () => {
    if (!canUseAIChatCommands(actorRole) || !chatInput.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/ai/travel-manager/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          message: chatInput,
          createdBy: actorId,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Chat failed");
      setChatReply(json.data.reply);
      setChatInput("");
      if (json.data.packageDraft || json.data.vehicleDraft || json.data.hotelDraft) {
        loadAll();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chat failed");
    } finally {
      setBusy(false);
    }
  };

  const statCards = stats
    ? [
        { label: "Packages Today", value: stats.packagesGeneratedToday, icon: Package },
        { label: "Competitors Analyzed", value: stats.competitorsAnalyzed, icon: Globe },
        { label: "Draft Packages", value: stats.draftPackages, icon: Sparkles },
        { label: "Published Packages", value: stats.publishedPackages, icon: Check },
        { label: "Hotels Generated", value: stats.draftHotels, icon: Building2 },
        { label: "Vehicles Generated", value: stats.draftVehicles, icon: Car },
        { label: "Pending Approvals", value: stats.pendingApprovals, icon: BarChart3 },
        { label: "AI Usage Today", value: stats.aiUsageToday, icon: Sparkles },
      ]
    : [];

  const renderPackageActions = (pkg: AIPackageDraft) => {
    const status = resolveApprovalStatus(pkg);
    return (
      <div className="flex flex-wrap gap-2">
        {canEditAIDraft(actorRole, status) && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => openPackageEdit(pkg)}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        )}
        {canRecommendApproval(actorRole) &&
          (status === "draft" || status === "manager_review") && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => draftAction("package", pkg.id, "recommend", pkg)}
            >
              Recommend Approval
            </Button>
          )}
        {canApproveAIContent(actorRole) &&
          ["draft", "manager_review", "pending_approval"].includes(status) && (
            <Button
              size="sm"
              disabled={busy}
              onClick={() => draftAction("package", pkg.id, "approve", pkg)}
            >
              <Check className="size-4" />
              Approve & Publish
            </Button>
          )}
        {canRejectAIDraft(actorRole) &&
          status !== "published" &&
          status !== "rejected" && (
            <Button
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => draftAction("package", pkg.id, "reject", pkg)}
            >
              <X className="size-4" />
              Reject
            </Button>
          )}
        {canGenerateAIContent(actorRole) && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => draftAction("package", pkg.id, "regenerate", pkg)}
          >
            <RefreshCw className="size-4" />
            Regenerate
          </Button>
        )}
      </div>
    );
  };

  const renderDraftActions = (
    type: "vehicle" | "hotel",
    id: string,
    status: string
  ) => (
    <div className="flex flex-wrap gap-2">
      {canRecommendApproval(actorRole) &&
        (status === "draft" || status === "manager_review") && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => draftAction(type, id, "recommend")}
          >
            Recommend Approval
          </Button>
        )}
      {canApproveAIContent(actorRole) &&
        ["draft", "manager_review", "pending_approval"].includes(status) && (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => draftAction(type, id, "approve")}
        >
          <Check className="size-4" />
          Approve & Publish
        </Button>
      )}
      {canRejectAIDraft(actorRole) && status !== "published" && status !== "rejected" && (
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => draftAction(type, id, "reject")}
        >
          <X className="size-4" />
          Reject
        </Button>
      )}
      {canGenerateAIContent(actorRole) && (
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => draftAction(type, id, "regenerate")}
        >
          <RefreshCw className="size-4" />
          Regenerate
        </Button>
      )}
    </div>
  );

  return (
    <>
      <AdminHeader
        title="AI Travel Manager"
        description="Competitor analysis, package generation, pricing, and approval workflow"
        adminName={user?.name ?? "Admin"}
      />

      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            {canViewCompetitorData(actorRole) && (
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
            )}
            <TabsTrigger value="packages">Packages</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
            <TabsTrigger value="hotels">Hotels</TabsTrigger>
            {canUseAIChatCommands(actorRole) && (
              <TabsTrigger value="chat">AI Chat</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading dashboard...
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {statCards.map((card) => (
                  <Card key={card.label}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {card.label}
                      </CardTitle>
                      <card.icon className="size-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{card.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Approval Workflow</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                AI creates draft → Manager reviews & recommends → Super Admin
                approves → Published live. Nothing is published automatically.
              </CardContent>
            </Card>
          </TabsContent>

          {canViewCompetitorData(actorRole) && (
            <TabsContent value="competitors" className="space-y-6">
              {canAnalyzeCompetitors(actorRole) ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Analyze Competitor Website</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Website URL</Label>
                      <Input
                        placeholder="https://competitor.com"
                        value={competitorUrl}
                        onChange={(e) => setCompetitorUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Website Name</Label>
                      <Input
                        placeholder="Competitor name"
                        value={competitorName}
                        onChange={(e) => setCompetitorName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Destination Hint</Label>
                      <Input
                        value={destinationHint}
                        onChange={(e) => setDestinationHint(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={analyzeCompetitor} disabled={busy}>
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Globe className="size-4" />}
                        Analyze Website
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground">
                    Competitor websites are analyzed by Super Admin. Once added, you can
                    select them when generating packages.
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {drafts?.competitors.length ? (
                  drafts.competitors.map((c) => (
                    <Card key={c.id}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                        <div>
                          <p className="font-medium">{c.websiteName}</p>
                          <p className="text-sm text-muted-foreground break-all">{c.websiteUrl}</p>
                          <p className="text-sm text-muted-foreground">
                            {c.packageName} — {c.destination}
                          </p>
                          <p className="text-sm">
                            {formatCurrency(c.price)} · {c.duration}
                          </p>
                        </div>
                        <Badge variant="outline">{c.destination}</Badge>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card>
                    <CardContent className="pt-6 text-sm text-muted-foreground">
                      No competitor websites analyzed yet.
                      {canAnalyzeCompetitors(actorRole)
                        ? " Add a URL above to extract package intelligence."
                        : " Ask your Super Admin to analyze competitor URLs first."}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="packages" className="space-y-6">
            {canGenerateAIContent(actorRole) && (
              <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-950/20">
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  <strong className="text-foreground">Workflow:</strong> Generate →{" "}
                  <strong>Edit</strong> price/details → Manager{" "}
                  <strong>Recommend Approval</strong> → Super Admin{" "}
                  <strong>Approve & Publish</strong> to customer website.
                </CardContent>
              </Card>
            )}

            {canGenerateAIContent(actorRole) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Auto Package Generator</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Input value={pkgDestination} onChange={(e) => setPkgDestination(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (days)</Label>
                    <Input value={pkgDays} onChange={(e) => setPkgDays(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Analyzed Competitor (optional)</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedCompetitorId}
                      onChange={(e) => setSelectedCompetitorId(e.target.value)}
                    >
                      <option value="">None</option>
                      {drafts?.competitors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.websiteName} — {c.destination}
                        </option>
                      ))}
                    </select>
                    {!drafts?.competitors.length && (
                      <p className="text-xs text-muted-foreground">
                        {canAnalyzeCompetitors(actorRole)
                          ? "Add competitor URLs in the Competitors tab or below."
                          : "No competitors yet — Super Admin must analyze URLs in the Competitors tab."}
                      </p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <Button onClick={generatePackage} disabled={busy}>
                      {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      Generate Package
                    </Button>
                  </div>
                  {canAnalyzeCompetitors(actorRole) && (
                    <>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Or analyze new competitor URL</Label>
                        <Input
                          placeholder="https://competitor.com/package-page"
                          value={inlineCompetitorUrl}
                          onChange={(e) => setInlineCompetitorUrl(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label>Competitor name (optional)</Label>
                        <Input
                          placeholder="Competitor website name"
                          value={inlineCompetitorName}
                          onChange={(e) => setInlineCompetitorName(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  Created Package Drafts ({drafts?.packages.length ?? 0})
                </h3>
                <a
                  href="/admin/packages"
                  className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
                >
                  Also view in Admin → Packages
                </a>
              </div>

              {!drafts?.packages.length ? (
                <Card>
                  <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
                    <p>No package drafts yet.</p>
                    <p>
                      After you click <strong>Generate Package</strong>, drafts appear
                      here with status <strong>draft</strong>. They are also listed under{" "}
                      <a href="/admin/packages" className="text-primary underline">
                        Admin → Packages
                      </a>{" "}
                      until Super Admin publishes them to the customer website.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                drafts.packages.map((pkg) => {
                  const status = resolveApprovalStatus(pkg);
                  return (
                <Card key={pkg.id}>
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{localizedText(pkg.title, "en")}</p>
                        <p className="text-sm text-muted-foreground">
                          {pkg.cities.join(", ")} · {pkg.duration} days · {formatCurrency(pkg.price)}
                        </p>
                        {pkg.priceBreakdown && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Base {formatCurrency(pkg.priceBreakdown.basePrice)} → Final{" "}
                            {formatCurrency(pkg.priceBreakdown.finalSellingPrice)} (margin{" "}
                            {pkg.priceBreakdown.profitPercent}%)
                          </p>
                        )}
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    {renderPackageActions(normalizePackageDraft(pkg))}
                  </CardContent>
                </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="vehicles" className="space-y-6">
            {canGenerateAIContent(actorRole) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Vehicle Manager</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <Label>Vehicle Name</Label>
                    <Input value={vehicleName} onChange={(e) => setVehicleName(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={generateVehicle} disabled={busy}>
                      <Car className="size-4" />
                      Generate Vehicle
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {drafts?.vehicles.map((veh) => (
                <Card key={veh.id}>
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{localizedText(veh.name, "en")}</p>
                        <p className="text-sm text-muted-foreground">
                          {veh.seats} seats · {formatCurrency(veh.pricePerDay)}/day · ₹{veh.pricePerKm}/km
                        </p>
                      </div>
                      <StatusBadge status={veh.approvalStatus} />
                    </div>
                    {renderDraftActions("vehicle", veh.id, resolveApprovalStatus(veh))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="hotels" className="space-y-6">
            {canGenerateAIContent(actorRole) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Hotel Manager</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <Label>City</Label>
                    <Input value={hotelCity} onChange={(e) => setHotelCity(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={generateHotel} disabled={busy}>
                      <Building2 className="size-4" />
                      Generate Hotel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              {drafts?.hotels.map((hotel) => (
                <Card key={hotel.id}>
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{localizedText(hotel.name, "en")}</p>
                        <p className="text-sm text-muted-foreground">
                          {hotel.city} · {hotel.starRating}★ · from {formatCurrency(hotel.priceFrom)}/night
                        </p>
                      </div>
                      <StatusBadge status={hotel.approvalStatus} />
                    </div>
                    {renderDraftActions("hotel", hotel.id, resolveApprovalStatus(hotel))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {canUseAIChatCommands(actorRole) && (
            <TabsContent value="chat" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Chat Assistant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Try: &quot;Create Goa honeymoon package&quot;, &quot;Generate Innova Crysta details&quot;,
                    &quot;Create Kerala family package&quot;, &quot;Generate itinerary for Kashmir 6 days&quot;
                  </p>
                  <Textarea
                    placeholder="Enter a natural language command..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={sendChat} disabled={busy || !chatInput.trim()}>
                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Send Command
                  </Button>
                  {chatReply && (
                    <div className="rounded-lg border bg-muted/50 p-4 text-sm">
                      <MessageSquare className="mb-2 size-4 text-primary" />
                      {chatReply}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Dialog
        open={!!editingPackage}
        onOpenChange={(open) => !open && setEditingPackage(null)}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Package Draft</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Package Title</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Input value={editDuration} onChange={(e) => setEditDuration(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPackage(null)}>
              Cancel
            </Button>
            <Button onClick={savePackageEdit} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
