import {
  getAllBlogSlugs,
  getAllHotelSlugs,
  getAllPackageSlugs,
  getAllVehicleIds,
} from "@/lib/catalog-service";
import {
  getAiCenterStats,
  hydrateAiCenterStore,
  listKeywords,
  listSeoMeta,
} from "@/lib/ai-center/repository";
import { appUrl, SITE_CONTACT } from "@/lib/site-config";
import { GA_MEASUREMENT_ID, CLARITY_PROJECT_ID } from "@/lib/analytics/config";
import { googleMapsUrl } from "@/lib/seo/schema";
import { fetchGoogleSearchConsolePerformance } from "@/lib/seo/google-search-console";
import { STATIC_SEO_PAGES } from "@/lib/seo/pages";

export interface SeoDashboardData {
  generatedAt: string;
  siteUrl: string;
  sitemapUrl: string;
  robotsUrl: string;
  analytics: {
    ga4Configured: boolean;
    clarityConfigured: boolean;
    ga4Id: string;
    clarityId: string;
  };
  searchConsole: {
    verificationReady: boolean;
    sitemapSubmitted: boolean;
    note: string;
  };
  indexedPages: {
    static: number;
    packages: number;
    hotels: number;
    vehicles: number;
    blogs: number;
    total: number;
  };
  metaTags: {
    status: "good" | "partial";
    pagesWithDynamicMeta: number;
    totalPublicPages: number;
    coveragePercent: number;
  };
  schema: {
    status: "good" | "partial";
    types: string[];
  };
  aiSeo: {
    keywordsPending: number;
    keywordsApproved: number;
    seoMetaRecords: number;
    blogsPublished: number;
    aiCenterUrl: string;
  };
  topKeywords: { keyword: string; destination?: string; status: string }[];
  performance: {
    nextImageOptimization: boolean;
    lazyLoading: boolean;
    webpSupport: boolean;
  };
  googleBusiness: {
    ready: boolean;
    phone: string;
    email: string;
    address: string;
    mapsUrl: string;
  };
  /** Live from Google Search Console API when service account is connected */
  searchPerformance: {
    clicks: number | null;
    impressions: number | null;
    ctr: number | null;
    position: number | null;
    connected: boolean;
    period: string;
    siteUrl: string | null;
    message: string;
  };
}

export async function getSeoDashboardData(): Promise<SeoDashboardData> {
  const [packageSlugs, hotelSlugs, vehicleIds, blogSlugs] = await Promise.all([
    getAllPackageSlugs(),
    getAllHotelSlugs(),
    getAllVehicleIds(),
    getAllBlogSlugs(),
  ]);

  await hydrateAiCenterStore();
  const keywords = listKeywords();
  const seoMeta = listSeoMeta();
  const aiStats = await getAiCenterStats();

  const staticCount = STATIC_SEO_PAGES.length;
  const total =
    staticCount + packageSlugs.length + hotelSlugs.length + vehicleIds.length + blogSlugs.length;

  const pagesWithDynamicMeta =
    packageSlugs.length + hotelSlugs.length + vehicleIds.length + blogSlugs.length + staticCount;

  const searchPerformance = await fetchGoogleSearchConsolePerformance();

  return {
    generatedAt: new Date().toISOString(),
    siteUrl: appUrl(),
    sitemapUrl: appUrl("/sitemap.xml"),
    robotsUrl: appUrl("/robots.txt"),
    analytics: {
      ga4Configured: Boolean(GA_MEASUREMENT_ID),
      clarityConfigured: Boolean(CLARITY_PROJECT_ID),
      ga4Id: GA_MEASUREMENT_ID ? `${GA_MEASUREMENT_ID.slice(0, 6)}…` : "Not set",
      clarityId: CLARITY_PROJECT_ID ? `${CLARITY_PROJECT_ID.slice(0, 6)}…` : "Not set",
    },
    searchConsole: {
      verificationReady: true,
      sitemapSubmitted: searchPerformance.connected,
      note: searchPerformance.connected
        ? `Connected to ${searchPerformance.siteUrl ?? "Google Search Console"}.`
        : "Submit sitemap.xml in Google Search Console after deploy.",
    },
    indexedPages: {
      static: staticCount,
      packages: packageSlugs.length,
      hotels: hotelSlugs.length,
      vehicles: vehicleIds.length,
      blogs: blogSlugs.length,
      total,
    },
    metaTags: {
      status: pagesWithDynamicMeta >= total * 0.9 ? "good" : "partial",
      pagesWithDynamicMeta,
      totalPublicPages: total,
      coveragePercent: Math.round((pagesWithDynamicMeta / Math.max(total, 1)) * 100),
    },
    schema: {
      status: "good",
      types: [
        "TravelAgency",
        "TouristTrip",
        "Hotel",
        "VehicleRental",
        "FAQPage",
        "BreadcrumbList",
        "BlogPosting",
        "AggregateRating",
      ],
    },
    aiSeo: {
      keywordsPending: keywords.filter((k) => k.status === "pending").length,
      keywordsApproved: keywords.filter((k) => k.status === "approved").length,
      seoMetaRecords: seoMeta.length,
      blogsPublished: aiStats.blogsPublished ?? 0,
      aiCenterUrl: "/admin/ai-center?tab=seo",
    },
    topKeywords: keywords
      .filter((k) => k.status === "approved" || k.status === "pending")
      .slice(0, 10)
      .map((k) => ({
        keyword: k.keyword,
        destination: k.destination,
        status: k.status,
      })),
    performance: {
      nextImageOptimization: true,
      lazyLoading: true,
      webpSupport: true,
    },
    googleBusiness: {
      ready: true,
      phone: SITE_CONTACT.phone,
      email: SITE_CONTACT.email,
      address: SITE_CONTACT.addressFull,
      mapsUrl: googleMapsUrl(),
    },
    searchPerformance: {
      clicks: searchPerformance.connected ? searchPerformance.clicks : null,
      impressions: searchPerformance.connected ? searchPerformance.impressions : null,
      ctr: searchPerformance.connected ? searchPerformance.ctr : null,
      position: searchPerformance.connected ? searchPerformance.position : null,
      connected: searchPerformance.connected,
      period: searchPerformance.period,
      siteUrl: searchPerformance.siteUrl,
      message: searchPerformance.message,
    },
  };
}
