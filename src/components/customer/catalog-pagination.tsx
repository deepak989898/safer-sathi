"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CatalogPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  startIndex: number;
  endIndex: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

function pageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i += 1) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export function CatalogPagination({
  page,
  totalPages,
  total,
  startIndex,
  endIndex,
  onPageChange,
  itemLabel = "hotels",
}: CatalogPaginationProps) {
  if (total <= 0) return null;

  const pages = pageNumbers(page, totalPages);

  return (
    <div className="flex flex-col items-center gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
      <p className="text-sm text-slate-600">
        Showing <span className="font-medium text-slate-900">{startIndex}–{endIndex}</span> of{" "}
        <span className="font-medium text-slate-900">{total.toLocaleString()}</span> {itemLabel}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`ellipsis-${i}`} className="px-2 text-slate-400">
              …
            </span>
          ) : (
            <Button
              key={p}
              type="button"
              variant={p === page ? "default" : "outline"}
              size="sm"
              className={`h-9 min-w-9 rounded-lg ${p === page ? "bg-[#1a4fa3] hover:bg-[#16408a]" : ""}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          )
        )}

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 rounded-lg"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
