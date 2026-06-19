"use client";

import Link from "next/link";
import { Megaphone, Sparkles } from "lucide-react";
import { AdminHeader } from "@/components/admin/admin-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

export default function MarketingPage() {
  const { user } = useAuth();

  return (
    <>
      <AdminHeader
        title="Marketing"
        description="Content and campaigns powered by live catalog data"
        adminName={user?.name ?? "Admin"}
      />
      <div className="space-y-6 p-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Megaphone className="size-5 text-primary" />
              Content library
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Demo blog posts have been removed. Use AI Travel Manager to generate
              packages, hotels, and marketing copy from your real catalog and competitor
              research.
            </p>
            <Button render={<Link href="/admin/ai-travel-manager" />}>
              <Sparkles className="mr-2 size-4" />
              Open AI Travel Manager
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
