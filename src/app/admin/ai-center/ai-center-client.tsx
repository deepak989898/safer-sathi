"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  Check,
  Eye,
  FileText,
  Globe,
  Loader2,
  RefreshCw,
  ScrollText,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AiCenterPhase3Tab } from "./ai-center-phase3-tab";
import { AiCenterAnalyticsTab } from "./ai-center-analytics-tab";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSingleImageUpload } from "@/components/admin/admin-image-url-field";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import type {
  AiBlogPost,
  AiCenterLog,
  AiCenterSettings,
  SeoKeyword,
  SeoMetaRecord,
} from "@/lib/ai-center/types";
import { toast } from "sonner";
import { approvedKeywordsWithoutBlog, keywordHasBlog } from "@/lib/ai-center/utils";
import {
  getBlogImagePrompts,
  resolveBlogFeaturedImage,
  resolveBlogImageKey,
} from "@/lib/ai-center/blog-destination-images";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";

interface AiCenterNavTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface AiCenterNavSection {
  id: string;
  label: string;
  description: string;
  tabs: AiCenterNavTab[];
}

const AI_CENTER_NAV_SECTIONS: AiCenterNavSection[] = [
  {
    id: "seo-content",
    label: "SEO & Blog",
    description: "Discover keywords, generate SEO meta, and publish blogs.",
    tabs: [
      { id: "seo", label: "SEO Agent", icon: Globe },
      { id: "keywords", label: "Keyword Research", icon: Search },
      { id: "blog-writer", label: "Blog Writer", icon: FileText },
      { id: "drafts", label: "Blog Drafts", icon: FileText },
      { id: "scheduled", label: "Scheduled", icon: Check },
      { id: "published", label: "Published", icon: Check },
    ],
  },
  {
    id: "analytics-reports",
    label: "Analytics & Reports",
    description: "Track AI performance and export insights.",
    tabs: [
      { id: "analytics", label: "AI Analytics", icon: BarChart3 },
      { id: "reports", label: "AI Reports", icon: BarChart3 },
    ],
  },
  {
    id: "phase3",
    label: "Phase 3 Agents",
    description: "Pricing, reviews, lead scoring, and fraud checks.",
    tabs: [
      { id: "phase3", label: "Phase 3 Hub", icon: Sparkles },
      { id: "phase3-pricing", label: "Dynamic Pricing", icon: TrendingUp },
      { id: "phase3-reviews", label: "Reviews", icon: Star },
      { id: "phase3-leads", label: "Lead Scoring", icon: Users },
      { id: "phase3-fraud", label: "Fraud Detection", icon: Shield },
    ],
  },
  {
    id: "system",
    label: "System",
    description: "Activity logs and global AI configuration.",
    tabs: [
      { id: "logs", label: "AI Logs", icon: ScrollText },
      { id: "settings", label: "AI Settings", icon: Settings },
    ],
  },
];

const AI_CENTER_TAB_LOOKUP = new Map(
  AI_CENTER_NAV_SECTIONS.flatMap((section) =>
    section.tabs.map((tab) => [tab.id, { ...tab, section }] as const)
  )
);

interface Stats {
  keywordsTotal: number;
  keywordsPending: number;
  keywordsApproved: number;
  blogsDraft: number;
  blogsPending: number;
  blogsPublished: number;
  blogsRejected: number;
  seoMetaCount: number;
}

const AI_CENTER_TABS = new Set([
  "seo",
  "keywords",
  "blog-writer",
  "drafts",
  "scheduled",
  "published",
  "analytics",
  "reports",
  "phase3-pricing",
  "phase3-reviews",
  "phase3-leads",
  "phase3-fraud",
  "phase3",
  "logs",
  "settings",
]);

export default function AiCenterClient() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabFromUrl && AI_CENTER_TABS.has(tabFromUrl) ? tabFromUrl : "seo"
  );

  useEffect(() => {
    if (tabFromUrl && AI_CENTER_TABS.has(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const { user } = useAuth();
  const actorRole = user?.role ?? "customer";
  const actorId = user?.id ?? user?.email ?? "super_admin";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [keywords, setKeywords] = useState<SeoKeyword[]>([]);
  const [seoMeta, setSeoMeta] = useState<SeoMetaRecord[]>([]);
  const [blogs, setBlogs] = useState<AiBlogPost[]>([]);
  const [logs, setLogs] = useState<AiCenterLog[]>([]);
  const [settings, setSettings] = useState<AiCenterSettings | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editBlog, setEditBlog] = useState<AiBlogPost | null>(null);
  const autoRunRef = useRef<{ tab: string; signature: string } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [kwRes, blogRes, logRes, settingsRes] = await Promise.all([
        fetch(`/api/admin/ai-center/keywords?actorRole=${actorRole}`),
        fetch(`/api/admin/ai-center/blogs?actorRole=${actorRole}`),
        fetch(`/api/admin/ai-center/logs?actorRole=${actorRole}&limit=100`),
        fetch(`/api/admin/ai-center/settings?actorRole=${actorRole}`),
      ]);
      const [kwJson, blogJson, logJson, settingsJson] = await Promise.all([
        kwRes.json(),
        blogRes.json(),
        logRes.json(),
        settingsRes.json(),
      ]);
      if (kwJson.success) {
        setKeywords(kwJson.data.keywords ?? []);
        setSeoMeta(kwJson.data.seoMeta ?? []);
        setStats(kwJson.data.stats ?? null);
      }
      if (blogJson.success) setBlogs(blogJson.data.blogs ?? []);
      if (logJson.success) {
        setLogs(logJson.data.logs ?? []);
        if (logJson.data.stats) setStats(logJson.data.stats);
      }
      if (settingsJson.success) setSettings(settingsJson.data);
    } catch {
      toast.error("Failed to load AI Center");
    } finally {
      setLoading(false);
    }
  }, [actorRole]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const pendingKeywords = useMemo(
    () => keywords.filter((k) => k.status === "pending"),
    [keywords]
  );
  const approvedKeywords = useMemo(
    () => keywords.filter((k) => k.status === "approved"),
    [keywords]
  );
  const blogWriterKeywords = useMemo(
    () => approvedKeywordsWithoutBlog(keywords, blogs),
    [keywords, blogs]
  );
  const draftBlogs = useMemo(
    () => blogs.filter((b) => b.status === "draft" || b.status === "pending_approval"),
    [blogs]
  );
  const scheduledBlogs = useMemo(
    () => blogs.filter((b) => b.status === "approved"),
    [blogs]
  );
  const publishedBlogs = useMemo(
    () =>
      blogs
        .filter((b) => b.status === "published")
        .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)),
    [blogs]
  );
  const rejectedBlogs = useMemo(
    () => blogs.filter((b) => b.status === "rejected"),
    [blogs]
  );

  const activeTabMeta = AI_CENTER_TAB_LOOKUP.get(activeTab);

  const runKeywordResearch = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-center/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, actorId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const count = json.data.count as number;
      const existingTotal = json.data.existingTotal as number | undefined;
      const googleSuggestCount = json.data.googleSuggestCount as number | undefined;
      if (count === 0) {
        toast.message("No new keywords added", {
          description: `You already have ${existingTotal ?? "your"} saved keywords. Run again for the next batch, or delete unused keywords in Keyword Research.`,
        });
      } else {
        const fromGoogle = googleSuggestCount
          ? ` ${googleSuggestCount} ideas fetched from Google Search.`
          : "";
        toast.success(`Added ${count} new keyword${count === 1 ? "" : "s"}`, {
          description: `${existingTotal ?? count} total in library.${fromGoogle}`,
        });
      }
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Keyword research failed");
    } finally {
      setBusy(false);
    }
  };

  const keywordAction = async (id: string, action: "approve" | "reject") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ai-center/keywords/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, actorId, action }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(action === "approve" ? "Keyword approved + SEO meta generated" : "Keyword rejected");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteKeyword = async (id: string) => {
    if (!confirm("Delete this keyword?")) return;
    await fetch(`/api/admin/ai-center/keywords/${id}?actorRole=${actorRole}`, { method: "DELETE" });
    toast.success("Keyword deleted");
    await loadAll();
  };

  const generateBlog = async (keywordId: string, silent = false) => {
    const res = await fetch("/api/admin/ai-center/blogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorRole, actorId, keywordId }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    if (!silent) {
      toast.success("Blog draft generated");
      await loadAll();
    }
    return json.data.blog as AiBlogPost;
  };

  const generateBlogClick = async (keywordId: string) => {
    setBusy(true);
    try {
      await generateBlog(keywordId, true);
      toast.success("Blog draft generated");
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Blog generation failed");
    } finally {
      setBusy(false);
    }
  };

  const runAutoGenerateAll = useCallback(async () => {
    const targets = approvedKeywordsWithoutBlog(keywords, blogs);
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const kw of targets) {
        await generateBlog(kw.id, true);
      }
      toast.success(`Auto-generated ${targets.length} blog${targets.length === 1 ? "" : "s"}`);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto generate failed");
      await loadAll();
    } finally {
      setBusy(false);
    }
  }, [keywords, blogs, actorRole, actorId, loadAll]);

  const runAutoApproveAllKeywords = useCallback(async () => {
    const targets = keywords.filter((k) => k.status === "pending");
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const kw of targets) {
        const res = await fetch(`/api/admin/ai-center/keywords/${kw.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorRole, actorId, action: "approve" }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
      }
      toast.success(`Auto-approved ${targets.length} keyword${targets.length === 1 ? "" : "s"}`);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto approve failed");
      await loadAll();
    } finally {
      setBusy(false);
    }
  }, [keywords, actorRole, actorId, loadAll]);

  const runAutoApproveAll = useCallback(async () => {
    const targets = blogs.filter(
      (b) => b.status === "pending_approval" || b.status === "draft"
    );
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const blog of targets) {
        const res = await fetch(`/api/admin/ai-center/blogs/${blog.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorRole, actorId, action: "approve" }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
      }
      toast.success(`Auto-approved ${targets.length} blog${targets.length === 1 ? "" : "s"}`);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto approve failed");
      await loadAll();
    } finally {
      setBusy(false);
    }
  }, [blogs, actorRole, actorId, loadAll]);

  const runAutoPublishAll = useCallback(async () => {
    const targets = blogs.filter((b) => b.status === "approved");
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const blog of targets) {
        const res = await fetch(`/api/admin/ai-center/blogs/${blog.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorRole, actorId, action: "publish" }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
      }
      toast.success(`Auto-published ${targets.length} blog${targets.length === 1 ? "" : "s"}`);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto publish failed");
      await loadAll();
    } finally {
      setBusy(false);
    }
  }, [blogs, actorRole, actorId, loadAll]);

  const saveAutomationToggle = async (
    field:
      | "autoKeywordApproveEnabled"
      | "autoBlogGenerateEnabled"
      | "autoBlogApproveEnabled"
      | "autoPublishEnabled",
    enabled: boolean,
    runBatch?: () => Promise<void>
  ) => {
    if (!settings) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-center/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          actorId,
          [field]: enabled,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSettings(json.data);
      if (field === "autoBlogGenerateEnabled" && !enabled) {
        autoRunRef.current = null;
      }
      if (field === "autoKeywordApproveEnabled" && !enabled) {
        autoRunRef.current = null;
      }
      if (field === "autoBlogApproveEnabled" && !enabled) {
        autoRunRef.current = null;
      }
      if (field === "autoPublishEnabled" && !enabled) {
        autoRunRef.current = null;
      }
      toast.success(enabled ? "Automation turned on" : "Automation turned off");
      if (enabled && runBatch) {
        if (field === "autoKeywordApproveEnabled") {
          autoRunRef.current = {
            tab: "keywords",
            signature: pendingKeywords.map((k) => k.id).join(","),
          };
        } else if (field === "autoBlogGenerateEnabled") {
          autoRunRef.current = {
            tab: "blog-writer",
            signature: blogWriterKeywords.map((k) => k.id).join(","),
          };
        } else if (field === "autoBlogApproveEnabled") {
          autoRunRef.current = {
            tab: "drafts",
            signature: draftBlogs.map((b) => b.id).join(","),
          };
        } else if (field === "autoPublishEnabled") {
          autoRunRef.current = {
            tab: "scheduled",
            signature: scheduledBlogs.map((b) => b.id).join(","),
          };
        }
        await runBatch();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save automation setting");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!settings?.autoKeywordApproveEnabled) return;
    if (activeTab !== "keywords" || busy || pendingKeywords.length === 0) return;
    const signature = pendingKeywords.map((k) => k.id).join(",");
    if (autoRunRef.current?.tab === "keywords" && autoRunRef.current.signature === signature) {
      return;
    }
    autoRunRef.current = { tab: "keywords", signature };
    void runAutoApproveAllKeywords();
  }, [
    activeTab,
    settings?.autoKeywordApproveEnabled,
    pendingKeywords,
    busy,
    runAutoApproveAllKeywords,
  ]);

  useEffect(() => {
    if (!settings?.autoBlogGenerateEnabled) return;
    if (activeTab !== "blog-writer" || busy || blogWriterKeywords.length === 0) return;
    const signature = blogWriterKeywords.map((k) => k.id).join(",");
    if (
      autoRunRef.current?.tab === "blog-writer" &&
      autoRunRef.current.signature === signature
    ) {
      return;
    }
    autoRunRef.current = { tab: "blog-writer", signature };
    void runAutoGenerateAll();
  }, [
    activeTab,
    settings?.autoBlogGenerateEnabled,
    blogWriterKeywords,
    busy,
    runAutoGenerateAll,
  ]);

  useEffect(() => {
    if (!settings?.autoBlogApproveEnabled) return;
    if (activeTab !== "drafts" || busy || draftBlogs.length === 0) return;
    const signature = draftBlogs.map((b) => b.id).join(",");
    if (autoRunRef.current?.tab === "drafts" && autoRunRef.current.signature === signature) {
      return;
    }
    autoRunRef.current = { tab: "drafts", signature };
    void runAutoApproveAll();
  }, [activeTab, settings?.autoBlogApproveEnabled, draftBlogs, busy, runAutoApproveAll]);

  useEffect(() => {
    if (!settings?.autoPublishEnabled) return;
    if (activeTab !== "scheduled" || busy || scheduledBlogs.length === 0) return;
    const signature = scheduledBlogs.map((b) => b.id).join(",");
    if (
      autoRunRef.current?.tab === "scheduled" &&
      autoRunRef.current.signature === signature
    ) {
      return;
    }
    autoRunRef.current = { tab: "scheduled", signature };
    void runAutoPublishAll();
  }, [activeTab, settings?.autoPublishEnabled, scheduledBlogs, busy, runAutoPublishAll]);

  const openBlogEditor = (blog: AiBlogPost) => {
    const imagePrompts = getBlogImagePrompts(blog.keyword, blog.destination);
    const featuredImage = resolveBlogFeaturedImage(blog);
    const hasCustomFeatured =
      featuredImage && !imagePrompts.some((prompt) => prompt.url === featuredImage);
    setEditBlog({
      ...blog,
      imagePrompts: hasCustomFeatured
        ? [
            {
              id: "custom-upload",
              label: "Uploaded image",
              prompt: "Admin upload",
              url: featuredImage,
            },
            ...imagePrompts,
          ]
        : imagePrompts,
      featuredImage,
    });
  };

  const blogAction = async (
    id: string,
    action: "approve" | "reject" | "publish" | "regenerate" | "update",
    extra?: Partial<AiBlogPost>
  ) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ai-center/blogs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorRole, actorId, action, ...extra }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast.success(`Blog ${action} successful`);
      setEditBlog(null);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Blog action failed");
    } finally {
      setBusy(false);
    }
  };

  const deleteBlog = async (id: string) => {
    if (!confirm("Delete this blog?")) return;
    await fetch(`/api/admin/ai-center/blogs/${id}?actorRole=${actorRole}`, { method: "DELETE" });
    toast.success("Blog deleted");
    await loadAll();
  };

  const saveSettings = async () => {
    if (!settings) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/ai-center/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actorRole,
          actorId,
          blogWordLimit: settings.blogWordLimit,
          keywordsPerDay: settings.keywordsPerDay,
          autoDraftEnabled: settings.autoDraftEnabled,
          autoPublishEnabled: settings.autoPublishEnabled,
          autoBlogGenerateEnabled: settings.autoBlogGenerateEnabled,
          autoKeywordApproveEnabled: settings.autoKeywordApproveEnabled,
          autoBlogApproveEnabled: settings.autoBlogApproveEnabled,
          approvalRequired: true,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSettings(json.data);
      toast.success("AI settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <AdminHeader
        title="AI Center"
        description="SEO, Blog, Analytics & Phase 3 Agents — Super Admin only"
        adminName={user?.name ?? "Super Admin"}
      />

      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <StatPill label="Keywords" value={stats?.keywordsTotal ?? 0} />
            <StatPill label="Pending" value={stats?.keywordsPending ?? 0} />
            <StatPill label="Published Blogs" value={stats?.blogsPublished ?? 0} />
            <StatPill label="SEO Meta" value={stats?.seoMetaCount ?? 0} />
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadAll()} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
            <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
              {AI_CENTER_NAV_SECTIONS.map((section) => (
                <div key={section.id} className="rounded-xl border bg-card p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/80">
                    {section.description}
                  </p>
                  <div className="mt-2 space-y-1">
                    {section.tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      let badge: number | null = null;
                      if (tab.id === "keywords") badge = pendingKeywords.length;
                      if (tab.id === "drafts") badge = draftBlogs.length;
                      if (tab.id === "scheduled") badge = scheduledBlogs.length;
                      if (tab.id === "published") badge = publishedBlogs.length;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-foreground/80 hover:bg-muted"
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{tab.label}</span>
                          </span>
                          {badge !== null && badge > 0 && (
                            <Badge
                              variant="secondary"
                              className={cn(
                                "h-5 min-w-5 shrink-0 px-1.5 text-[10px]",
                                isActive && "bg-primary-foreground/20 text-primary-foreground"
                              )}
                            >
                              {badge}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </aside>

            <div className="min-w-0 space-y-4">
              {activeTabMeta && (
                <div className="rounded-xl border bg-muted/25 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {activeTabMeta.section.label}
                  </p>
                  <h2 className="text-lg font-semibold text-[#0c2444]">{activeTabMeta.label}</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {activeTabMeta.section.description}
                  </p>
                </div>
              )}

          <TabsContent value="seo" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  AI SEO Agent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Discovers keywords from <strong>Google Search autocomplete</strong> (real queries people type),
                  plus your packages, hotels & destinations. When you approve a keyword, AI generates SEO title,
                  description, slug, FAQ, OpenGraph & schema markup into Firebase.
                </p>
                <Button onClick={() => void runKeywordResearch()} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Run Keyword Research
                </Button>
                <p className="text-xs text-muted-foreground">
                  Adds up to {settings?.keywordsPerDay ?? 10} <strong>new</strong> keywords per run.
                  Sources: Google Search suggestions (always) · template fallbacks · optional SerpAPI if{" "}
                  <code className="rounded bg-muted px-1">SERP_API_KEY</code> is set in Vercel env.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  {seoMeta.slice(0, 6).map((meta) => (
                    <div key={meta.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-semibold">{meta.seoTitle}</p>
                      <p className="text-xs text-muted-foreground mt-1">{meta.seoDescription}</p>
                      <p className="text-xs mt-2">Focus: {meta.focusKeyword}</p>
                      <Link href={`/blog/${meta.slug}`} className="text-xs text-primary hover:underline">
                        /blog/{meta.slug}
                      </Link>
                    </div>
                  ))}
                  {seoMeta.length === 0 && (
                    <p className="text-sm text-muted-foreground">Approve keywords to generate SEO meta.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-4">
            <BlogAutomationBar
              label="Auto Approve"
              description="When on, all pending keywords are approved automatically (SEO meta is generated for each)."
              enabled={settings?.autoKeywordApproveEnabled ?? false}
              disabled={busy || !settings}
              onToggle={(enabled) =>
                void saveAutomationToggle(
                  "autoKeywordApproveEnabled",
                  enabled,
                  enabled ? runAutoApproveAllKeywords : undefined
                )
              }
            />
            <KeywordTable
              title="Pending Keywords"
              items={pendingKeywords}
              busy={busy}
              onApprove={(id) => void keywordAction(id, "approve")}
              onReject={(id) => void keywordAction(id, "reject")}
              onDelete={(id) => void deleteKeyword(id)}
              onGenerateBlog={(id) => void generateBlogClick(id)}
              showGenerate
            />
            <div className="mt-6">
              <KeywordTable
                title="Approved Keywords"
                items={approvedKeywords}
                blogs={blogs}
                busy={busy}
                onApprove={() => {}}
                onReject={() => {}}
                onDelete={(id) => void deleteKeyword(id)}
                onGenerateBlog={(id) => void generateBlogClick(id)}
                showGenerate
                hideActions
              />
            </div>
          </TabsContent>

          <TabsContent value="blog-writer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  AI Blog Writer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <BlogAutomationBar
                  label="Auto Generate"
                  description="When on, all keywords below are generated automatically (one by one)."
                  enabled={settings?.autoBlogGenerateEnabled ?? false}
                  disabled={busy || !settings}
                  onToggle={(enabled) =>
                    void saveAutomationToggle(
                      "autoBlogGenerateEnabled",
                      enabled,
                      enabled ? runAutoGenerateAll : undefined
                    )
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Select an approved keyword and generate a full SEO blog ({settings?.blogWordLimit ?? 1500} words)
                  with image prompts, FAQ, and meta tags.
                </p>
                {blogWriterKeywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {approvedKeywords.length === 0
                      ? "Approve keywords first."
                      : "All approved keywords already have blog drafts. Open Blog Drafts to review them."}
                  </p>
                ) : (
                  blogWriterKeywords.map((kw) => (
                    <div key={kw.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                      <span className="font-medium">{kw.keyword}</span>
                      <Button size="sm" disabled={busy} onClick={() => void generateBlogClick(kw.id)}>
                        Generate Blog
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="drafts">
            <BlogAutomationBar
              className="mb-4"
              label="Auto Approve"
              description="When on, all drafts and pending blogs are approved automatically."
              enabled={settings?.autoBlogApproveEnabled ?? false}
              disabled={busy || !settings}
              onToggle={(enabled) =>
                void saveAutomationToggle(
                  "autoBlogApproveEnabled",
                  enabled,
                  enabled ? runAutoApproveAll : undefined
                )
              }
            />
            <BlogTable
              title="Drafts & Pending Approval"
              blogs={draftBlogs}
              busy={busy}
              onEdit={openBlogEditor}
              onApprove={(id) => void blogAction(id, "approve")}
              onReject={(id) => void blogAction(id, "reject")}
              onPublish={(id) => void blogAction(id, "publish")}
              onRegenerate={(id) => void blogAction(id, "regenerate")}
              onDelete={(id) => void deleteBlog(id)}
            />
          </TabsContent>

          <TabsContent value="scheduled">
            <BlogAutomationBar
              className="mb-4"
              label="Auto Publish"
              description="When on, all approved blogs in this list are published automatically."
              enabled={settings?.autoPublishEnabled ?? false}
              disabled={busy || !settings}
              onToggle={(enabled) =>
                void saveAutomationToggle(
                  "autoPublishEnabled",
                  enabled,
                  enabled ? runAutoPublishAll : undefined
                )
              }
            />
            <BlogTable
              title="Approved — Ready to Publish"
              blogs={scheduledBlogs}
              busy={busy}
              onEdit={openBlogEditor}
              onApprove={() => {}}
              onReject={(id) => void blogAction(id, "reject")}
              onPublish={(id) => void blogAction(id, "publish")}
              onRegenerate={(id) => void blogAction(id, "regenerate")}
              onDelete={(id) => void deleteBlog(id)}
              publishOnly
            />
          </TabsContent>

          <TabsContent value="published">
            <BlogTable
              title="Published Blogs"
              subtitle="Sorted by page views — see which blogs perform best"
              blogs={publishedBlogs}
              busy={busy}
              onEdit={openBlogEditor}
              onApprove={() => {}}
              onReject={() => {}}
              onPublish={() => {}}
              onRegenerate={(id) => void blogAction(id, "regenerate")}
              onDelete={(id) => void deleteBlog(id)}
              publishedOnly
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AiCenterAnalyticsTab
              actorRole={actorRole}
              actorId={actorId}
              busy={busy}
              setBusy={setBusy}
            />
          </TabsContent>

          <TabsContent value="reports">
            <AiCenterAnalyticsTab
              actorRole={actorRole}
              actorId={actorId}
              busy={busy}
              setBusy={setBusy}
              reportsOnly
            />
          </TabsContent>

          <TabsContent value="phase3">
            <AiCenterPhase3Tab
              actorRole={actorRole}
              actorId={actorId}
              busy={busy}
              setBusy={setBusy}
            />
          </TabsContent>

          <TabsContent value="phase3-pricing">
            <AiCenterPhase3Tab actorRole={actorRole} actorId={actorId} busy={busy} setBusy={setBusy} defaultSubTab="pricing" />
          </TabsContent>

          <TabsContent value="phase3-reviews">
            <AiCenterPhase3Tab actorRole={actorRole} actorId={actorId} busy={busy} setBusy={setBusy} defaultSubTab="reviews" />
          </TabsContent>

          <TabsContent value="phase3-leads">
            <AiCenterPhase3Tab actorRole={actorRole} actorId={actorId} busy={busy} setBusy={setBusy} defaultSubTab="leads" />
          </TabsContent>

          <TabsContent value="phase3-fraud">
            <AiCenterPhase3Tab actorRole={actorRole} actorId={actorId} busy={busy} setBusy={setBusy} defaultSubTab="fraud" />
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5" />
                  AI Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline">{log.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                        {log.durationMs ? ` · ${log.durationMs}ms` : ""}
                      </span>
                    </div>
                    <p className="mt-1">{log.message}</p>
                    {log.error && <p className="text-xs text-destructive mt-1">{log.error}</p>}
                  </div>
                ))}
                {logs.length === 0 && <p className="text-sm text-muted-foreground">No logs yet.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-0">
            {settings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    AI Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Blog word limit</Label>
                    <Select
                      value={String(settings.blogWordLimit)}
                      onValueChange={(v) =>
                        setSettings({ ...settings, blogWordLimit: Number(v) as AiCenterSettings["blogWordLimit"] })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1000, 1500, 2000, 3000].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} words</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Keywords per day</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={settings.keywordsPerDay}
                      onChange={(e) =>
                        setSettings({ ...settings, keywordsPerDay: Number(e.target.value) || 10 })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="font-medium">Auto Draft</p>
                      <p className="text-xs text-muted-foreground">Auto-create blog drafts on keyword approve</p>
                    </div>
                    <Switch
                      checked={settings.autoDraftEnabled}
                      onCheckedChange={(v) => setSettings({ ...settings, autoDraftEnabled: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="font-medium">Auto Publish</p>
                      <p className="text-xs text-muted-foreground">Off by default — Super Admin must publish</p>
                    </div>
                    <Switch
                      checked={settings.autoPublishEnabled}
                      onCheckedChange={(v) => setSettings({ ...settings, autoPublishEnabled: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2 bg-muted/40">
                    <div>
                      <p className="font-medium">Approval Required</p>
                      <p className="text-xs text-muted-foreground">Always ON — no blog goes live without approval</p>
                    </div>
                    <Switch checked disabled />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="font-medium">Package Approval Required</p>
                      <p className="text-xs text-muted-foreground">Packages must be approved before publish</p>
                    </div>
                    <Switch
                      checked={settings.packageApprovalRequired ?? true}
                      onCheckedChange={(v) => setSettings({ ...settings, packageApprovalRequired: v })}
                    />
                  </div>
                  <div>
                    <Label>Default package duration (days)</Label>
                    <Input
                      type="number"
                      min={2}
                      max={14}
                      value={settings.defaultPackageDuration ?? 5}
                      onChange={(e) =>
                        setSettings({ ...settings, defaultPackageDuration: Number(e.target.value) || 5 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Default margin %</Label>
                    <Input
                      type="number"
                      min={5}
                      max={40}
                      value={settings.defaultMarginPercent ?? 18}
                      onChange={(e) =>
                        setSettings({ ...settings, defaultMarginPercent: Number(e.target.value) || 18 })
                      }
                    />
                  </div>
                  <div>
                    <Label>Voice default locale</Label>
                    <Select
                      value={settings.voiceDefaultLocale ?? "auto"}
                      onValueChange={(v) =>
                        setSettings({ ...settings, voiceDefaultLocale: v as AiCenterSettings["voiceDefaultLocale"] })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Voice gender</Label>
                    <Select
                      value={settings.voiceGender ?? "female"}
                      onValueChange={(v) =>
                        setSettings({ ...settings, voiceGender: v as AiCenterSettings["voiceGender"] })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="font-medium">Voice auto language detect</p>
                    </div>
                    <Switch
                      checked={settings.voiceAutoDetectLanguage ?? true}
                      onCheckedChange={(v) => setSettings({ ...settings, voiceAutoDetectLanguage: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="font-medium">Analytics auto report</p>
                    </div>
                    <Switch
                      checked={settings.analyticsAutoReport ?? false}
                      onCheckedChange={(v) => setSettings({ ...settings, analyticsAutoReport: v })}
                    />
                  </div>
                  <div className="sm:col-span-2 pt-2">
                    <p className="text-sm font-semibold">Phase 3 AI Agents</p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div><p className="font-medium">Dynamic Pricing</p></div>
                    <Switch checked={settings.dynamicPricingEnabled ?? true} onCheckedChange={(v) => setSettings({ ...settings, dynamicPricingEnabled: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div><p className="font-medium">Review Agent</p></div>
                    <Switch checked={settings.reviewAgentEnabled ?? true} onCheckedChange={(v) => setSettings({ ...settings, reviewAgentEnabled: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div><p className="font-medium">Lead Scoring</p></div>
                    <Switch checked={settings.leadScoringEnabled ?? true} onCheckedChange={(v) => setSettings({ ...settings, leadScoringEnabled: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div><p className="font-medium">Fraud Detection</p></div>
                    <Switch checked={settings.fraudDetectionEnabled ?? true} onCheckedChange={(v) => setSettings({ ...settings, fraudDetectionEnabled: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2 bg-muted/40">
                    <div><p className="font-medium">Price approval required</p></div>
                    <Switch checked={settings.priceApprovalRequired ?? true} onCheckedChange={(v) => setSettings({ ...settings, priceApprovalRequired: v })} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2 bg-muted/40">
                    <div><p className="font-medium">Review approval required</p></div>
                    <Switch checked={settings.reviewApprovalRequired ?? true} onCheckedChange={(v) => setSettings({ ...settings, reviewApprovalRequired: v })} />
                  </div>
                  <div>
                    <Label>Fraud risk threshold (0–100)</Label>
                    <Input type="number" min={0} max={100} value={settings.fraudRiskThreshold ?? 50} onChange={(e) => setSettings({ ...settings, fraudRiskThreshold: Number(e.target.value) || 50 })} />
                  </div>
                  <div>
                    <Label>Hot lead threshold</Label>
                    <Input type="number" min={0} max={100} value={settings.leadHotThreshold ?? 80} onChange={(e) => setSettings({ ...settings, leadHotThreshold: Number(e.target.value) || 80 })} />
                  </div>
                  <div className="sm:col-span-2">
                    <Button onClick={() => void saveSettings()} disabled={busy}>
                      Save Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>

      <Dialog open={!!editBlog} onOpenChange={(o) => !o && setEditBlog(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Blog
              {editBlog?.status === "published" && (
                <Badge className="ml-2 align-middle" variant="secondary">
                  Published — saves go live
                  {typeof editBlog.viewCount === "number" ? (
                    <> · {editBlog.viewCount.toLocaleString("en-IN")} views</>
                  ) : null}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {editBlog && (
            <div className="space-y-3">
              <div>
                <Label>Title</Label>
                <Input
                  value={editBlog.title}
                  onChange={(e) => setEditBlog({ ...editBlog, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Meta description</Label>
                <Input
                  value={editBlog.metaDescription}
                  onChange={(e) => setEditBlog({ ...editBlog, metaDescription: e.target.value })}
                />
              </div>
              <div>
                <Label>Content (markdown)</Label>
                <Textarea
                  rows={12}
                  value={editBlog.content}
                  onChange={(e) => setEditBlog({ ...editBlog, content: e.target.value })}
                />
              </div>
              <div>
                <Label>Blog images</Label>
                <p className="mb-2 text-xs text-muted-foreground">
                  Matched to keyword &quot;{editBlog.keyword}&quot; →{" "}
                  <span className="font-medium capitalize">
                    {resolveBlogImageKey(editBlog.keyword, editBlog.destination)}
                  </span>
                  . Upload your own image or click a thumbnail to set the featured hero on the live blog.
                </p>
                <AdminSingleImageUpload
                  folder="blogs"
                  actorRole={actorRole}
                  disabled={busy}
                  label="Upload custom image"
                  hint="Image is compressed automatically before upload."
                  onUploaded={(url) =>
                    setEditBlog((prev) => {
                      if (!prev) return prev;
                      const custom = {
                        id: `custom-${Date.now()}`,
                        label: "Uploaded image",
                        prompt: "Admin upload",
                        url,
                      };
                      const imagePrompts = prev.imagePrompts.some((p) => p.url === url)
                        ? prev.imagePrompts
                        : [custom, ...prev.imagePrompts];
                      return { ...prev, imagePrompts, featuredImage: url };
                    })
                  }
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  {editBlog.imagePrompts.map((img) => {
                    const isFeatured = editBlog.featuredImage === img.url;
                    return (
                      <button
                        key={img.id}
                        type="button"
                        className={cn(
                          "overflow-hidden rounded-lg border text-left transition-colors",
                          isFeatured
                            ? "border-primary ring-2 ring-primary/30"
                            : "hover:border-primary/50"
                        )}
                        onClick={() =>
                          setEditBlog({ ...editBlog, featuredImage: img.url })
                        }
                      >
                        <div className="relative aspect-video w-full bg-muted">
                          <SafeImage
                            src={img.url}
                            alt={img.label}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 280px"
                          />
                        </div>
                        <div className="space-y-0.5 p-2">
                          <p className="text-xs font-medium">
                            {img.label}
                            {isFeatured ? " · Featured" : ""}
                          </p>
                          <p className="line-clamp-2 text-[10px] text-muted-foreground">
                            {img.prompt}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditBlog(null)}>Cancel</Button>
            <Button
              disabled={busy || !editBlog}
              onClick={() =>
                editBlog &&
                void blogAction(editBlog.id, "update", {
                  title: editBlog.title,
                  content: editBlog.content,
                  excerpt: editBlog.excerpt,
                  metaTitle: editBlog.title,
                  metaDescription: editBlog.metaDescription,
                  featuredImage: editBlog.featuredImage,
                })
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BlogAutomationBar({
  label,
  description,
  enabled,
  disabled,
  className,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  className?: string;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3",
        className
      )}
    >
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{enabled ? "On" : "Off"}</span>
        <Switch checked={enabled} disabled={disabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <Badge variant="secondary" className="px-3 py-1">
      {label}: <strong className="ml-1">{value}</strong>
    </Badge>
  );
}

function KeywordSourceBadge({ source }: { source?: SeoKeyword["source"] }) {
  if (!source || source === "template") {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground">
        Template
      </Badge>
    );
  }
  if (source === "google_suggest") {
    return (
      <Badge variant="secondary" className="font-normal">
        Google
      </Badge>
    );
  }
  if (source === "google_serp") {
    return (
      <Badge variant="secondary" className="font-normal">
        Google SERP
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-normal">
      AI
    </Badge>
  );
}

function KeywordTable({
  title,
  items,
  blogs = [],
  busy,
  onApprove,
  onReject,
  onDelete,
  onGenerateBlog,
  showGenerate,
  hideActions,
}: {
  title: string;
  items: SeoKeyword[];
  blogs?: AiBlogPost[];
  busy: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  onGenerateBlog: (id: string) => void;
  showGenerate?: boolean;
  hideActions?: boolean;
}) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2">Keyword</th>
              <th className="p-2">Searches/mo</th>
              <th className="p-2">Competition</th>
              <th className="p-2">Trend</th>
              <th className="p-2">Category</th>
              <th className="p-2">SEO</th>
              <th className="p-2">Source</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((kw) => (
              <tr key={kw.id} className="border-b">
                <td className="p-2 font-medium">{kw.keyword}</td>
                <td className="p-2">{kw.searchVolume.toLocaleString("en-IN")}</td>
                <td className="p-2"><StatusBadge status={kw.competition === "low" ? "success" : kw.competition === "medium" ? "pending" : "failed"} label={kw.competition} /></td>
                <td className="p-2">{kw.trendScore}</td>
                <td className="p-2">{kw.category.replace(/_/g, " ")}</td>
                <td className="p-2">{kw.seoScore}</td>
                <td className="p-2">
                  <KeywordSourceBadge source={kw.source} />
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {!hideActions && kw.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => onApprove(kw.id)}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => onReject(kw.id)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    {showGenerate &&
                      kw.status === "approved" &&
                      !keywordHasBlog(kw, blogs) && (
                      <Button size="sm" variant="secondary" disabled={busy} onClick={() => onGenerateBlog(kw.id)}>
                        Blog
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDelete(kw.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <p className="py-6 text-center text-muted-foreground">No keywords.</p>}
      </CardContent>
    </Card>
  );
}

function BlogTable({
  title,
  subtitle,
  blogs,
  busy,
  onEdit,
  onApprove,
  onReject,
  onPublish,
  onRegenerate,
  onDelete,
  publishOnly,
  publishedOnly,
  readOnly,
}: {
  title: string;
  subtitle?: string;
  blogs: AiBlogPost[];
  busy: boolean;
  onEdit: (b: AiBlogPost) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onPublish: (id: string) => void;
  onRegenerate: (id: string) => void;
  onDelete: (id: string) => void;
  publishOnly?: boolean;
  publishedOnly?: boolean;
  readOnly?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {blogs.map((blog) => (
          <div key={blog.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-muted">
                <SafeImage
                  src={resolveBlogFeaturedImage(blog)}
                  alt={blog.title}
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{blog.title}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {blog.wordCount} words · {blog.keyword} · /blog/{blog.slug}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={blog.status === "published" ? "success" : "pending"} label={blog.status.replace(/_/g, " ")} />
                  {publishedOnly && (
                    <Badge variant="outline" className="gap-1 font-normal">
                      <Eye className="h-3 w-3" />
                      {(blog.viewCount ?? 0).toLocaleString("en-IN")} page view
                      {(blog.viewCount ?? 0) === 1 ? "" : "s"}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {(!readOnly || publishedOnly) && (
                  <Button size="sm" variant="outline" onClick={() => onEdit(blog)}>Edit</Button>
                )}
                {!readOnly && !publishOnly && !publishedOnly && blog.status === "pending_approval" && (
                  <>
                    <Button size="sm" disabled={busy} onClick={() => onApprove(blog.id)}>Approve</Button>
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => onReject(blog.id)}>Reject</Button>
                  </>
                )}
                {!readOnly && !publishedOnly && (blog.status === "approved" || publishOnly) && (
                  <Button size="sm" disabled={busy} onClick={() => onPublish(blog.id)}>Publish</Button>
                )}
                {!readOnly && !publishOnly && (
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => onRegenerate(blog.id)}>Regenerate</Button>
                )}
                {(!readOnly || publishedOnly) && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => onDelete(blog.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
                {blog.status === "published" && (
                  <Link href={`/blog/${blog.slug}`} target="_blank">
                    <Button size="sm" variant="outline">View</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
        {blogs.length === 0 && <p className="text-sm text-muted-foreground">No blogs in this section.</p>}
      </CardContent>
    </Card>
  );
}
