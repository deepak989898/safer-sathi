export type KeywordStatus = "pending" | "approved" | "rejected";
export type BlogStatus = "draft" | "pending_approval" | "approved" | "published" | "rejected";
export type KeywordCategory =
  | "tour_packages"
  | "hotels"
  | "vehicles"
  | "destinations"
  | "travel_guides"
  | "local";

export type AiLogType =
  | "keyword_generated"
  | "keyword_approved"
  | "keyword_rejected"
  | "seo_meta_generated"
  | "blog_generated"
  | "blog_approved"
  | "blog_rejected"
  | "blog_published"
  | "blog_deleted"
  | "error";

export interface SeoKeyword {
  id: string;
  keyword: string;
  searchVolume: number;
  competition: "low" | "medium" | "high";
  trendScore: number;
  category: KeywordCategory;
  destination?: string;
  seoScore: number;
  status: KeywordStatus;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface SeoMetaRecord {
  id: string;
  keywordId: string;
  keyword: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  slug: string;
  faq: { question: string; answer: string }[];
  metaKeywords: string[];
  openGraph: {
    title: string;
    description: string;
    image?: string;
    url: string;
  };
  schemaMarkup: Record<string, unknown>;
  canonicalUrl: string;
  createdAt: string;
}

export interface BlogImagePrompt {
  id: string;
  label: string;
  prompt: string;
  url: string;
}

export interface AiBlogPost {
  id: string;
  title: string;
  slug: string;
  keyword: string;
  keywordId?: string;
  category: KeywordCategory;
  destination?: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  imagePrompts: BlogImagePrompt[];
  faq: { question: string; answer: string }[];
  wordCount: number;
  status: BlogStatus;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedReason?: string;
}

export interface AiCenterLog {
  id: string;
  type: AiLogType;
  message: string;
  resourceId?: string;
  resourceType?: "keyword" | "blog" | "seo_meta" | "settings";
  durationMs?: number;
  error?: string;
  createdAt: string;
}

export interface AiCenterSettings {
  id: "global";
  blogWordLimit: 1000 | 1500 | 2000 | 3000;
  keywordsPerDay: number;
  autoDraftEnabled: boolean;
  autoPublishEnabled: boolean;
  approvalRequired: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_AI_CENTER_SETTINGS: AiCenterSettings = {
  id: "global",
  blogWordLimit: 1500,
  keywordsPerDay: 10,
  autoDraftEnabled: false,
  autoPublishEnabled: false,
  approvalRequired: true,
  updatedAt: new Date().toISOString(),
};
