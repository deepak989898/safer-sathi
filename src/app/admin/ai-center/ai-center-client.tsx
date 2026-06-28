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
  MapPin,
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
import { SeoPublishWorkflowProgress } from "./seo-publish-workflow-progress";
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
import { adminApiFetch } from "@/lib/admin/api-client";
import type {
  AiBlogPost,
  AiCenterLog,
  AiCenterSettings,
  AiImageGenerationLog,
  SeoKeyword,
  SeoMetaRecord,
} from "@/lib/ai-center/types";
import { toast } from "sonner";
import { approvedKeywordsWithoutBlog, computeSeoPublishWorkflowStats, keywordHasBlog } from "@/lib/ai-center/utils";
import { blogImagesFromExisting } from "@/lib/media/blog-image-service";
import { resolveBlogFeaturedImage, resolveBlogImageKey } from "@/lib/ai-center/blog-destination-images";
import { ADMIN_BLOG_IMAGES_SECTION_HINT } from "@/lib/admin/image-upload-hints";
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
  const [generateAiImage, setGenerateAiImage] = useState(false);
  const [imageGenerationLogs, setImageGenerationLogs] = useState<AiImageGenerationLog[]>([]);
  const [imageGenerationStats, setImageGenerationStats] = useState<{
    monthlyGenerated: number;
    monthlyCostEstimateUsd: number;
    estimatedCostPerImageUsd: number;
  } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editBlog, setEditBlog] = useState<AiBlogPost | null>(null);
  const [citySearchName, setCitySearchName] = useState("");
  const [cityPreview, setCityPreview] = useState<SeoKeyword[]>([]);
  const [cityPreviewCity, setCityPreviewCity] = useState<string | null>(null);
  const [selectedCityKeywordIds, setSelectedCityKeywordIds] = useState<Set<string>>(
    () => new Set()
  );
  const autoRunRef = useRef<{ tab: string; signature: string } | null>(null);
  const automationCancelRef = useRef(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [kwRes, blogRes, logRes, settingsRes] = await Promise.all([
        adminApiFetch("/api/admin/ai-center/keywords"),
        adminApiFetch("/api/admin/ai-center/blogs"),
        adminApiFetch("/api/admin/ai-center/logs?limit=100"),
        adminApiFetch("/api/admin/ai-center/settings"),
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
      if (settingsJson.success) {
        setSettings(settingsJson.data);
        setGenerateAiImage(settingsJson.data.openAiImagesDefaultToggle ?? false);
      }
    } catch {
      toast.error("Failed to load AI Center");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadImageGenerationLogs = useCallback(async () => {
    try {
      const res = await adminApiFetch("/api/admin/ai-center/image-generation");
      const json = await res.json();
      if (json.success) {
        setImageGenerationLogs(json.data.logs ?? []);
        setImageGenerationStats(json.data.stats ?? null);
      }
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    if (activeTab === "settings") {
      void loadImageGenerationLogs();
    }
  }, [activeTab, loadImageGenerationLogs]);

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
  const workflowStats = useMemo(
    () => computeSeoPublishWorkflowStats(keywords, blogs, seoMeta),
    [keywords, blogs, seoMeta]
  );

  const activeTabMeta = AI_CENTER_TAB_LOOKUP.get(activeTab);

  const runKeywordResearch = async () => {
    setBusy(true);
    try {
      const res = await adminApiFetch("/api/admin/ai-center/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
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

  const runCityKeywordSearch = async () => {
    const city = citySearchName.trim();
    if (city.length < 2) {
      toast.error("Please enter a city name (at least 2 characters).");
      return;
    }
    setBusy(true);
    try {
      const res = await adminApiFetch("/api/admin/ai-center/keywords/city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          mode: "preview",
          limit: 100,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const rows = (json.data.keywords ?? []) as SeoKeyword[];
      setCityPreview(rows);
      setCityPreviewCity(json.data.city as string);
      setSelectedCityKeywordIds(new Set(rows.map((row) => row.id)));
      toast.success(`Found ${rows.length} keywords for ${json.data.city}`, {
        description: `${json.data.templateCount ?? 0} templates · ${json.data.googleSuggestCount ?? 0} from Google`,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "City keyword search failed");
    } finally {
      setBusy(false);
    }
  };

  const toggleCityKeywordSelection = (id: string, checked: boolean) => {
    setSelectedCityKeywordIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const removeCityPreviewKeyword = (id: string) => {
    setCityPreview((prev) => prev.filter((row) => row.id !== id));
    setSelectedCityKeywordIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const saveSelectedCityKeywords = async () => {
    if (!cityPreviewCity) return;
    const selected = cityPreview.filter((row) => selectedCityKeywordIds.has(row.id));
    if (selected.length === 0) {
      toast.error("Select at least one keyword to save.");
      return;
    }
    setBusy(true);
    try {
      const res = await adminApiFetch("/api/admin/ai-center/keywords/city", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: cityPreviewCity,
          mode: "save",
          keywords: selected,
          autoApprove: settings?.autoKeywordApproveEnabled ?? false,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const added = json.data.count as number;
      const approved = json.data.approvedCount as number;
      toast.success(`Saved ${added} keyword${added === 1 ? "" : "s"}`, {
        description: approved
          ? `${approved} auto-approved with SEO meta.`
          : "Open Keyword Research to approve or generate blogs.",
      });
      setCityPreview([]);
      setCityPreviewCity(null);
      setSelectedCityKeywordIds(new Set());
      setCitySearchName("");
      await loadAll();
      if (!json.data.autoApprove && added > 0) {
        setActiveTab("keywords");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save city keywords");
    } finally {
      setBusy(false);
    }
  };

  const keywordAction = async (id: string, action: "approve" | "reject") => {
    setBusy(true);
    try {
      const res = await adminApiFetch(`/api/admin/ai-center/keywords/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
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
    await adminApiFetch(`/api/admin/ai-center/keywords/${id}`, { method: "DELETE" });
    toast.success("Keyword deleted");
    await loadAll();
  };

  const generateBlog = async (keywordId: string, silent = false, aiImage?: boolean) => {
    const useAiImage =
      aiImage ??
      (settings?.openAiImagesEnabled && settings?.openAiImagesDefaultToggle) ??
      false;

    const res = await adminApiFetch("/api/admin/ai-center/blogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywordId, generateAiImage: useAiImage }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    const imageMessage = json.data?.imageGenerationMessage as string | undefined;

    if (!silent) {
      toast.success("Blog draft generated");
      if (imageMessage) {
        toast.warning(imageMessage);
      }
      await loadAll();
    } else if (imageMessage) {
      toast.warning(imageMessage);
    }

    return json.data.blog as AiBlogPost;
  };

  const generateBlogClick = async (keywordId: string) => {
    setBusy(true);
    try {
      const useAiImage =
        generateAiImage && (settings?.openAiImagesEnabled ?? false);
      await generateBlog(keywordId, true, useAiImage);
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
    if (automationCancelRef.current) return;

    const useAiImage =
      (settings?.openAiImagesEnabled && settings?.openAiImagesDefaultToggle) ?? false;
    automationCancelRef.current = false;
    setBusy(true);
    let generated = 0;
    try {
      for (const kw of targets) {
        if (automationCancelRef.current) break;
        await generateBlog(kw.id, true, useAiImage);
        generated += 1;
      }
      if (generated > 0 && !automationCancelRef.current) {
        toast.success(`Auto-generated ${generated} blog${generated === 1 ? "" : "s"}`);
      } else if (generated > 0) {
        toast.info(`Auto generate stopped (${generated} blog${generated === 1 ? "" : "s"} completed)`);
      }
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auto generate failed");
      await loadAll();
    } finally {
      setBusy(false);
    }
  }, [keywords, blogs, loadAll, settings?.openAiImagesEnabled, settings?.openAiImagesDefaultToggle]);

  const runAutoApproveAllKeywords = useCallback(async () => {
    const targets = keywords.filter((k) => k.status === "pending");
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const kw of targets) {
        const res = await adminApiFetch(`/api/admin/ai-center/keywords/${kw.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
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
  }, [keywords, loadAll]);

  const runAutoApproveAll = useCallback(async () => {
    const targets = blogs.filter(
      (b) => b.status === "pending_approval" || b.status === "draft"
    );
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const blog of targets) {
        const res = await adminApiFetch(`/api/admin/ai-center/blogs/${blog.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "approve" }),
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
  }, [blogs, loadAll]);

  const runAutoPublishAll = useCallback(async () => {
    const targets = blogs.filter((b) => b.status === "approved");
    if (targets.length === 0) return;
    setBusy(true);
    try {
      for (const blog of targets) {
        const res = await adminApiFetch(`/api/admin/ai-center/blogs/${blog.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish" }),
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
  }, [blogs, loadAll]);

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

    if (!enabled) {
      automationCancelRef.current = true;
      autoRunRef.current = null;
      const previous = settings[field];
      setSettings({ ...settings, [field]: false });

      try {
        const res = await adminApiFetch("/api/admin/ai-center/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: false }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        setSettings(json.data);
        toast.success("Automation turned off");
      } catch (e) {
        setSettings({ ...settings, [field]: previous });
        automationCancelRef.current = false;
        toast.error(e instanceof Error ? e.message : "Failed to turn off automation");
      }
      return;
    }

    automationCancelRef.current = false;
    setBusy(true);
    try {
      const res = await adminApiFetch("/api/admin/ai-center/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSettings(json.data);
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
      toast.success("Automation turned on");
      if (runBatch) {
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
    if (automationCancelRef.current) return;
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
    const assigned = blogImagesFromExisting(blog);
    const imagePrompts = assigned.imagePrompts;
    const featuredImage = assigned.featuredImage || resolveBlogFeaturedImage(blog);
    setEditBlog({
      ...blog,
      imagePrompts,
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
      const res = await adminApiFetch(`/api/admin/ai-center/blogs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
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
    await adminApiFetch(`/api/admin/ai-center/blogs/${id}`, { method: "DELETE" });
    toast.success("Blog deleted");
    await loadAll();
  };

  const saveSettings = async () => {
    if (!settings) return;
    setBusy(true);
    try {
      const res = await adminApiFetch("/api/admin/ai-center/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogWordLimit: settings.blogWordLimit,
          keywordsPerDay: settings.keywordsPerDay,
          autoDraftEnabled: settings.autoDraftEnabled,
          autoPublishEnabled: settings.autoPublishEnabled,
          autoBlogGenerateEnabled: settings.autoBlogGenerateEnabled,
          autoKeywordApproveEnabled: settings.autoKeywordApproveEnabled,
          autoBlogApproveEnabled: settings.autoBlogApproveEnabled,
          approvalRequired: true,
          openAiImagesEnabled: settings.openAiImagesEnabled,
          openAiImagesDefaultToggle: settings.openAiImagesDefaultToggle,
          openAiImagesMaxPerBlog: settings.openAiImagesMaxPerBlog,
          openAiImagesMonthlyLimit: settings.openAiImagesMonthlyLimit,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSettings(json.data);
      setGenerateAiImage(json.data.openAiImagesDefaultToggle ?? false);
      toast.success("AI settings saved");
      if (activeTab === "settings") {
        void loadImageGenerationLogs();
      }
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

      <div className="space-y-4 p-3 sm:space-y-6 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <StatPill label="Keywords" value={stats?.keywordsTotal ?? 0} />
            <StatPill label="Pending" value={stats?.keywordsPending ?? 0} />
            <StatPill label="Published Blogs" value={stats?.blogsPublished ?? 0} />
            <StatPill label="SEO Meta" value={stats?.seoMetaCount ?? 0} />
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => void loadAll()} disabled={busy}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {AI_CENTER_NAV_SECTIONS.map((section) => {
              const isSectionActive = activeTabMeta?.section.id === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    if (!isSectionActive) {
                      setActiveTab(section.tabs[0].id);
                    }
                  }}
                  className={cn(
                    "rounded-xl border bg-card p-4 text-left transition-colors",
                    isSectionActive
                      ? "border-primary shadow-sm ring-2 ring-primary/15"
                      : "hover:border-primary/30 hover:bg-muted/20"
                  )}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.label}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground/80">
                    {section.description}
                  </p>
                </button>
              );
            })}
          </div>

          {activeTabMeta && (
            <div className="rounded-xl border bg-card p-2 sm:p-3">
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                {activeTabMeta.section.tabs.map((tab) => {
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
                        "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-foreground/80 hover:bg-muted"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{tab.label}</span>
                      {badge !== null && badge > 0 && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            "h-5 min-w-5 px-1.5 text-[10px]",
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
          )}

          <div className="min-w-0 space-y-4">
            {activeTabMeta && (
              <div className="rounded-xl border bg-muted/25 px-3 py-3 sm:px-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {activeTabMeta.section.label}
                </p>
                <h2 className="text-base font-semibold text-[#0c2444] sm:text-lg">{activeTabMeta.label}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
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

                <CityKeywordResearchPanel
                  citySearchName={citySearchName}
                  onCitySearchNameChange={setCitySearchName}
                  cityPreview={cityPreview}
                  cityPreviewCity={cityPreviewCity}
                  selectedIds={selectedCityKeywordIds}
                  busy={busy}
                  autoApproveEnabled={settings?.autoKeywordApproveEnabled ?? false}
                  onSearch={() => void runCityKeywordSearch()}
                  onSave={() => void saveSelectedCityKeywords()}
                  onToggleSelect={toggleCityKeywordSelection}
                  onSelectAll={(checked) => {
                    setSelectedCityKeywordIds(
                      checked ? new Set(cityPreview.map((row) => row.id)) : new Set()
                    );
                  }}
                  onRemove={removeCityPreviewKeyword}
                  onAutoApproveToggle={(enabled) =>
                    void saveAutomationToggle(
                      "autoKeywordApproveEnabled",
                      enabled,
                      enabled ? runAutoApproveAllKeywords : undefined
                    )
                  }
                  settingsReady={Boolean(settings)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-4">
            <SeoPublishWorkflowProgress
              stats={workflowStats}
              onGoToTab={(tabId) => setActiveTab(tabId)}
            />
            <CityKeywordResearchPanel
              citySearchName={citySearchName}
              onCitySearchNameChange={setCitySearchName}
              cityPreview={cityPreview}
              cityPreviewCity={cityPreviewCity}
              selectedIds={selectedCityKeywordIds}
              busy={busy}
              autoApproveEnabled={settings?.autoKeywordApproveEnabled ?? false}
              onSearch={() => void runCityKeywordSearch()}
              onSave={() => void saveSelectedCityKeywords()}
              onToggleSelect={toggleCityKeywordSelection}
              onSelectAll={(checked) => {
                setSelectedCityKeywordIds(
                  checked ? new Set(cityPreview.map((row) => row.id)) : new Set()
                );
              }}
              onRemove={removeCityPreviewKeyword}
              onAutoApproveToggle={(enabled) =>
                void saveAutomationToggle(
                  "autoKeywordApproveEnabled",
                  enabled,
                  enabled ? runAutoApproveAllKeywords : undefined
                )
              }
              settingsReady={Boolean(settings)}
            />
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
            <GenerateAiImageBar
              enabled={generateAiImage}
              disabled={busy || !settings || !settings.openAiImagesEnabled}
              masterEnabled={settings?.openAiImagesEnabled ?? false}
              onToggle={setGenerateAiImage}
            />
            <KeywordTable
              title={`Pending Keywords (${pendingKeywords.length})`}
              subtitle={
                pendingKeywords.length > 0
                  ? `${pendingKeywords.length} waiting for approval · ${workflowStats.stages[1]?.remaining ?? 0} will get SEO meta on approve`
                  : "No keywords waiting — all caught up on approvals."
              }
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
                title={`Approved Keywords (${approvedKeywords.length})`}
                subtitle={
                  approvedKeywords.length > 0
                    ? `${workflowStats.summary.withSeoMeta} with SEO meta · ${workflowStats.summary.needBlog} need blog · ${workflowStats.summary.published} published live`
                    : "Approve pending keywords to start the SEO and blog pipeline."
                }
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
            <SeoPublishWorkflowProgress
              stats={workflowStats}
              onlyStageId="blog-draft"
            />
            <Card className="mt-3">
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
                <GenerateAiImageBar
                  enabled={generateAiImage}
                  disabled={busy || !settings || !settings.openAiImagesEnabled}
                  masterEnabled={settings?.openAiImagesEnabled ?? false}
                  onToggle={setGenerateAiImage}
                />
                <p className="text-sm text-muted-foreground">
                  Select an approved keyword and generate a full SEO blog ({settings?.blogWordLimit ?? 1500} words)
                  with image prompts, FAQ, and meta tags.
                </p>
                {blogWriterKeywords.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {approvedKeywords.length === 0
                      ? "Approve keywords first."
                      : `All ${approvedKeywords.length} approved keyword${approvedKeywords.length === 1 ? "" : "s"} already have blog drafts (${workflowStats.summary.published} published, ${workflowStats.summary.blogDrafts + workflowStats.summary.readyToPublish} in pipeline).`}
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
            <SeoPublishWorkflowProgress stats={workflowStats} onlyStageId="blog-approve" />
            <BlogAutomationBar
              className="mb-4 mt-3"
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
            <SeoPublishWorkflowProgress stats={workflowStats} onlyStageId="publish" />
            <BlogAutomationBar
              className="mb-4 mt-3"
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
                  <div className="sm:col-span-2 pt-2 border-t">
                    <p className="text-sm font-semibold">Image Generation</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional OpenAI featured images for blog drafts. Uses dall-e-2 at 512×512 (~$
                      {(imageGenerationStats?.estimatedCostPerImageUsd ?? 0.018).toFixed(3)} per image).
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="font-medium">Enable OpenAI Images</p>
                      <p className="text-xs text-muted-foreground">
                        Master switch — when off, blogs use the existing image catalog only.
                      </p>
                    </div>
                    <Switch
                      checked={settings.openAiImagesEnabled ?? false}
                      onCheckedChange={(v) => setSettings({ ...settings, openAiImagesEnabled: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <p className="font-medium">Default Toggle</p>
                      <p className="text-xs text-muted-foreground">
                        Default ON/OFF for &quot;Generate AI Image&quot; in Blog Writer (OFF saves API cost).
                      </p>
                    </div>
                    <Switch
                      checked={settings.openAiImagesDefaultToggle ?? false}
                      onCheckedChange={(v) =>
                        setSettings({ ...settings, openAiImagesDefaultToggle: v })
                      }
                    />
                  </div>
                  <div>
                    <Label>Maximum Images Per Blog</Label>
                    <Input
                      type="number"
                      min={1}
                      max={1}
                      readOnly
                      value={settings.openAiImagesMaxPerBlog ?? 1}
                    />
                  </div>
                  <div>
                    <Label>Monthly Image Limit</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={settings.openAiImagesMonthlyLimit ?? 100}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          openAiImagesMonthlyLimit: Number(e.target.value) || 100,
                        })
                      }
                    />
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-2">
                    <p className="text-sm font-medium">Monthly Cost Estimate</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {imageGenerationStats?.monthlyGenerated ?? 0} images this month · est. $
                      {(imageGenerationStats?.monthlyCostEstimateUsd ?? 0).toFixed(2)} USD
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="mb-2 text-sm font-medium">Image Generation Logs</p>
                    <div className="max-h-[280px] overflow-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="p-2">Time</th>
                            <th className="p-2">Blog</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Source</th>
                            <th className="p-2">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {imageGenerationLogs.map((log) => (
                            <tr key={log.id} className="border-b">
                              <td className="p-2 text-xs text-muted-foreground">
                                {new Date(log.createdAt).toLocaleString("en-IN")}
                              </td>
                              <td className="p-2">
                                <span className="line-clamp-2">{log.blogTitle}</span>
                              </td>
                              <td className="p-2">
                                <Badge variant={log.success ? "secondary" : "destructive"}>
                                  {log.success ? "Success" : "Failed"}
                                </Badge>
                              </td>
                              <td className="p-2 capitalize">{log.imageSource}</td>
                              <td className="p-2">
                                {log.success
                                  ? `$${(log.estimatedCostUsd ?? 0).toFixed(3)}`
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {imageGenerationLogs.length === 0 && (
                        <p className="p-4 text-sm text-muted-foreground">No image generation logs yet.</p>
                      )}
                    </div>
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
                <p className="mb-2 whitespace-pre-line rounded-md border border-border/80 bg-muted/40 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
                  {ADMIN_BLOG_IMAGES_SECTION_HINT}
                  {"\n"}
                  Keyword &quot;{editBlog.keyword}&quot; →{" "}
                  <span className="font-medium capitalize">
                    {resolveBlogImageKey(editBlog.keyword, editBlog.destination)}
                  </span>
                  . Click a thumbnail to set the featured hero on the live blog.
                </p>
                <AdminSingleImageUpload
                  folder="blogs"
                  actorRole={actorRole}
                  disabled={busy}
                  label="Upload custom featured image"
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
  // Allow turning OFF while a batch is running; only block turning ON when disabled.
  const switchDisabled = disabled && !enabled;

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
        <Switch checked={enabled} disabled={switchDisabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}

function GenerateAiImageBar({
  enabled,
  disabled,
  masterEnabled,
  onToggle,
  className,
}: {
  enabled: boolean;
  disabled?: boolean;
  masterEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-3",
        className
      )}
    >
      <div>
        <p className="font-medium">Generate AI Image</p>
        <p className="text-xs text-muted-foreground">
          {masterEnabled
            ? "When on, one OpenAI featured image is created after blog content (uses API credits)."
            : "Enable OpenAI Images in AI Settings to use this option."}
        </p>
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
    <Badge variant="secondary" className="justify-center px-2 py-1 text-xs sm:px-3 sm:text-sm">
      <span className="truncate">{label}:</span> <strong className="ml-1">{value}</strong>
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
  if (source === "city_research") {
    return (
      <Badge variant="secondary" className="font-normal">
        City
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="font-normal">
      AI
    </Badge>
  );
}

function CityKeywordResearchPanel({
  citySearchName,
  onCitySearchNameChange,
  cityPreview,
  cityPreviewCity,
  selectedIds,
  busy,
  autoApproveEnabled,
  settingsReady,
  onSearch,
  onSave,
  onToggleSelect,
  onSelectAll,
  onRemove,
  onAutoApproveToggle,
}: {
  citySearchName: string;
  onCitySearchNameChange: (value: string) => void;
  cityPreview: SeoKeyword[];
  cityPreviewCity: string | null;
  selectedIds: Set<string>;
  busy: boolean;
  autoApproveEnabled: boolean;
  settingsReady: boolean;
  onSearch: () => void;
  onSave: () => void;
  onToggleSelect: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onRemove: (id: string) => void;
  onAutoApproveToggle: (enabled: boolean) => void;
}) {
  const allSelected =
    cityPreview.length > 0 && cityPreview.every((row) => selectedIds.has(row.id));

  return (
    <div className="space-y-4 rounded-xl border border-dashed border-primary/30 bg-muted/20 p-4">
      <div>
        <p className="flex items-center gap-2 font-semibold text-[#0c2444]">
          <MapPin className="h-4 w-4 text-primary" />
          City-wise Keyword Research
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a city (e.g. Orai) to generate ~100 local travel keywords — tours, buses, cabs,
          rentals, and route packages. Review, remove unwanted rows, then save to your library.
        </p>
      </div>

      <BlogAutomationBar
        label="Auto Approve"
        description="When on, saved city keywords are approved automatically (SEO meta generated for each)."
        enabled={autoApproveEnabled}
        disabled={busy || !settingsReady}
        onToggle={onAutoApproveToggle}
      />

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <Label htmlFor="city-keyword-search">City name</Label>
          <Input
            id="city-keyword-search"
            placeholder="e.g. Orai, Lucknow, Jaipur"
            value={citySearchName}
            onChange={(e) => onCitySearchNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
          />
        </div>
        <Button onClick={onSearch} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
          Search Keywords
        </Button>
      </div>

      {cityPreview.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {cityPreviewCity}: {cityPreview.length} keywords · {selectedIds.size} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => onSelectAll(!allSelected)}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
              <Button size="sm" disabled={busy || selectedIds.size === 0} onClick={onSave}>
                Save selected to library
              </Button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="w-10 p-2" />
                  <th className="p-2">Keyword</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">SEO</th>
                  <th className="p-2">Source</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cityPreview.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={selectedIds.has(row.id)}
                        onChange={(e) => onToggleSelect(row.id, e.target.checked)}
                      />
                    </td>
                    <td className="p-2 font-medium">{row.keyword}</td>
                    <td className="p-2">{row.category.replace(/_/g, " ")}</td>
                    <td className="p-2">{row.seoScore}</td>
                    <td className="p-2">
                      <KeywordSourceBadge source={row.source} />
                    </td>
                    <td className="p-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onRemove(row.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KeywordTable({
  title,
  subtitle,
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
  subtitle?: string;
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
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
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
        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {title.toLowerCase().includes("pending")
              ? "No pending keywords — everything is approved or add new keywords via city search above."
              : "No approved keywords yet — approve pending keywords or turn on Auto Approve."}
          </p>
        )}
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
