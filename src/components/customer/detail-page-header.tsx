"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface DetailPageHeaderProps {
  title: string;
  backHref: string;
  backLabel: string;
}

export function DetailPageHeader({
  title,
  backHref,
  backLabel,
}: DetailPageHeaderProps) {
  return (
    <div className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <p className="mt-2 text-lg font-semibold text-primary md:text-xl">{title}</p>
      </div>
    </div>
  );
}
