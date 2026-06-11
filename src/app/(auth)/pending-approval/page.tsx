"use client";

import Link from "next/link";
import { Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

export default function PendingApprovalPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-lg text-center shadow-xl">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              <Clock className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl">Awaiting Admin Approval</CardTitle>
            <CardDescription>
              Your staff account has been submitted. A Super Admin or Manager must approve
              it before you can access the admin panel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              You will receive access after approval. Then sign in with the email and
              password you registered.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/login">
                <Button variant="outline">Back to Sign In</Button>
              </Link>
              <Link href="/">
                <Button>Go to Homepage</Button>
              </Link>
            </div>
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              Need help? Contact hello@safarsathi.com
            </p>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}
