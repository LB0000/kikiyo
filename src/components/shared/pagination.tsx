"use client";

import { cn } from "@/lib/utils";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);
  return pages;
}

const BTN_BASE =
  "flex h-9 w-9 items-center justify-center rounded border text-sm transition-colors";

export function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="ページネーション" className="flex items-center justify-center gap-1 py-4">
      <button
        type="button"
        className={cn(BTN_BASE, "text-muted-foreground hover:bg-pink-50 disabled:opacity-40")}
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        aria-label="最初のページ"
      >
        |&lt;
      </button>
      <button
        type="button"
        className={cn(BTN_BASE, "text-muted-foreground hover:bg-pink-50 disabled:opacity-40")}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="前のページ"
      >
        &lt;
      </button>

      {pages.map((page, i) =>
        page === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            className={cn(
              BTN_BASE,
              page === currentPage
                ? "bg-pink-400 text-white border-pink-400"
                : "text-muted-foreground hover:bg-pink-50"
            )}
            onClick={() => onPageChange(page)}
            aria-label={`ページ ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        className={cn(BTN_BASE, "text-muted-foreground hover:bg-pink-50 disabled:opacity-40")}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="次のページ"
      >
        &gt;
      </button>
      <button
        type="button"
        className={cn(BTN_BASE, "text-muted-foreground hover:bg-pink-50 disabled:opacity-40")}
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="最後のページ"
      >
        &gt;|
      </button>
    </nav>
  );
}
