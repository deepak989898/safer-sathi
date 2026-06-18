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
import { demoAIAgents } from "@/data/demo-data";
import { localizedText } from "@/lib/i18n";
import type { AIAgentType } from "@/types";

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
        {demoAIAgents.map((agent) => {
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
                    <span className="text-muted-foreground">Success Rate</span>
                    <span className="font-medium">{agent.successRate}%</span>
                  </div>
                  <Progress value={agent.successRate} className="h-2" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tasks Handled</span>
                  <span className="font-medium">{agent.tasksHandled.toLocaleString("en-IN")}</span>
                </div>
                {agent.lastRun && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Run</span>
                    <span className="font-medium">
                      {new Date(agent.lastRun).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                )}
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
