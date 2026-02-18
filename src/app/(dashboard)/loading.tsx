import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-1 rounded" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="ml-7 h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>

      {/* ツールバー */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* テーブル */}
      <div className="rounded-md border">
        <div className="flex gap-4 border-b bg-muted/30 p-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b p-3 last:border-b-0">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
