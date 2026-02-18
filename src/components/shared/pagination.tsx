"use client";

import { cn } from "@/lib/utils";

type Props = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      <button
        className="flex h-9 w-9 items-center justify-center rounded border text-sm text-muted-foreground hover:bg-pink-50 disabled:opacity-40"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        aria-label="最初のページ"
      >
        |&lt;
      </button>
      <button
        className="flex h-9 w-9 items-center justify-center rounded border text-sm text-muted-foreground hover:bg-pink-50 disabled:opacity-40"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="前のページ"
      >
        &lt;
      </button>

      {pages.map((page) => (
        <button
          key={page}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded border text-sm transition-colors",
            page === currentPage
              ? "bg-pink-400 text-white border-pink-400"
              : "text-muted-foreground hover:bg-pink-50"
          )}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      <button
        className="flex h-9 w-9 items-center justify-center rounded border text-sm text-muted-foreground hover:bg-pink-50 disabled:opacity-40"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="次のページ"
      >
        &gt;
      </button>
      <button
        className="flex h-9 w-9 items-center justify-center rounded border text-sm text-muted-foreground hover:bg-pink-50 disabled:opacity-40"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        aria-label="最後のページ"
      >
        &gt;|
      </button>
    </div>
  );
}
