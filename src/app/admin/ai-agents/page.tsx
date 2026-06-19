"use client";

import type { ElementType } from "react";
import {
  BarChart3,
  Bot,
  CalendarCheck,
  Headphones,
  Megaphone,
  Settings2,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { localizedText } from "@/lib/i18n";
import type { AIAgent, AIAgentType } from "@/types";

const agentCatalog: AIAgent[] = [
  {
    id: "travel",
    name: { en: "Travel Agent", hi: "यात्रा एजेंट" },
    description: { en: "Trip planning and package recommendations", hi: "यात्रा योजना" },
    status: "active",
    successRate: 0,
    tasksHandled: 0,
  },
  {
    id: "support",
    name: { en: "Support Agent", hi: "सहायता एजेंट" },
    description: { en: "Customer support and booking help", hi: "ग्राहक सहायता" },
    status: "active",
    successRate: 0,
    tasksHandled: 0,
  },
  {
    id: "sales",
    name: { en: "Sales Agent", hi: "बिक्री एजेंट" },
    description: { en: "Lead follow-ups and conversions", hi: "लीड फॉलो-अप" },
    status: "active",
    successRate: 0,
    tasksHandled: 0,
  },
  {
    id: "marketing",
    name: { en: "Marketing Agent", hi: "मार्केटिंग एजेंट" },
    description: { en: "Blog and social content generation", hi: "कंटेंट जनरेशन" },
    status: "active",
    successRate: 0,
    tasksHandled: 0,
  },
  {
    id: "analytics",
    name: { en: "Analytics Agent", hi: "एनालिटिक्स एजेंट" },
    description: { en: "Business insights from live data", hi: "व्यापार विश्लेषण" },
    status: "active",
    successRate: 0,
    tasksHandled: 0,
  },
  {
    id: "fraud",
    name: { en: "Fraud Agent", hi: "धोखाधड़ी एजेंट" },
    description: { en: "Booking risk checks", hi: "बुकिंग जोखिम जांच" },
    status: "active",
    successRate: 0,
    tasksHandled: 0,
  },
  {
    id: "market_packages",
    name: { en: "Market Packages", hi: "मार्केट पैकेज" },
    description: { en: "AI package drafts from market research", hi: "AI पैकेज ड्राफ्ट" },
    status: "active",
    successRate: 0,
    tasksHandled: 0,
  },
];

const agentIcons: Record<AIAgentType, ElementType> = {
  travel: Bot,
  booking: CalendarCheck,
  support: Headphones,
  sales: ShoppingBag,
  marketing: Megaphone,
  analytics: BarChart3,
  seo: Megaphone,
  social: Megaphone,
  fraud: Settings2,
  market_packages: TrendingUp,
};

export default function AIAgentsPage() {
  return (
    <>
      <AdminHeader
        title="AI Agents"
        description="Monitor and manage autonomous AI agents"
        adminName="Rajesh Kumar"
      />
      <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
        {agentCatalog.map((agent) => {
          const Icon = agentIcons[agent.id] ?? Bot;
          return (
            <Card key={agent.id} className="shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {localizedText(agent.name, "en")}
                    </CardTitle>
                    <StatusBadge status={agent.status} className="mt-1" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {localizedText(agent.description, "en")}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">Ready</span>
                  </div>
                  <Progress value={100} className="h-2" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Metrics will populate as agents handle real tasks.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">
                  <Settings2 className="size-4" />
                  Manage Agent
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </>
  );
}
