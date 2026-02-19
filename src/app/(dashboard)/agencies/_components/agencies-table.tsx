"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowUpDown,
  Building2,
  ChevronDown,
  ChevronUp,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { AGENCY_RANK_LABELS } from "@/lib/constants";
import type { AgencyWithHierarchy } from "@/lib/actions/agencies";
import type { AgencyRank } from "@/lib/supabase/types";

type Props = {
  agencies: AgencyWithHierarchy[];
  onSelect: (agency: AgencyWithHierarchy) => void;
};

const PAGE_SIZE = 10;

type SortKey = "name" | "rank" | "commission_rate" | "created_at" | null;
type SortDir = "asc" | "desc";

const RANK_BADGE_STYLES: Record<string, string> = {
  rank_2: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  rank_3: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  rank_4: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const RANK_ORDER: Record<string, number> = { rank_2: 2, rank_3: 3, rank_4: 4 };

const ONBOARDING_BADGE_STYLES: Record<string, string> = {
  not_invited: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  invited: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const ONBOARDING_LABELS: Record<string, string> = {
  not_invited: "未招待",
  invited: "招待済",
  active: "利用開始",
};

function getOnboardingStatus(agency: AgencyWithHierarchy) {
  if (agency.last_sign_in_at) return "active";
  if (agency.registration_email_sent_at) return "invited";
  return "not_invited";
}

function getOnboardingTooltip(agency: AgencyWithHierarchy): string | null {
  if (agency.last_sign_in_at) {
    return `最終ログイン: ${new Date(agency.last_sign_in_at).toLocaleDateString("ja-JP")}`;
  }
  if (agency.registration_email_sent_at) {
    return `送信日: ${new Date(agency.registration_email_sent_at).toLocaleDateString("ja-JP")}`;
  }
  return null;
}

function SortableHead({
  children,
  sortKey: key,
  currentKey,
  currentDir,
  onSort,
  className,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentKey === key;
  return (
    <TableHead
      className={cn("cursor-pointer select-none", className)}
      onClick={() => onSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive ? (
          currentDir === "asc" ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
        )}
      </span>
    </TableHead>
  );
}

export function AgenciesTable({ agencies, onSelect }: Props) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const sorted = [...agencies].sort((a, b) => {
    if (!sortKey) return 0;
    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.name.localeCompare(b.name, "ja");
        break;
      case "rank":
        cmp = (RANK_ORDER[a.rank ?? ""] ?? 99) - (RANK_ORDER[b.rank ?? ""] ?? 99);
        break;
      case "commission_rate":
        cmp = a.commission_rate - b.commission_rate;
        break;
      case "created_at":
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedAgencies = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <TooltipProvider>
      <div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort}>
                  代理店名
                </SortableHead>
                <SortableHead sortKey="rank" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort}>
                  代理店ランク
                </SortableHead>
                <TableHead className="hidden md:table-cell">上位代理店</TableHead>
                <SortableHead sortKey="commission_rate" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="text-right">
                  手数料率
                </SortableHead>
                <SortableHead sortKey="created_at" currentKey={sortKey} currentDir={sortDir} onSort={toggleSort} className="hidden lg:table-cell">
                  提携日
                </SortableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {agencies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-0">
                    <EmptyState
                      icon={Building2}
                      title="代理店がありません"
                      description="新しい代理店を登録してください"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pagedAgencies.map((agency) => (
                  <TableRow
                    key={agency.id}
                    className="cursor-pointer"
                    onClick={() => onSelect(agency)}
                  >
                    <TableCell className="font-medium">{agency.name}</TableCell>
                    <TableCell>
                      {agency.rank ? (
                        <Badge
                          variant="outline"
                          className={cn("border-transparent", RANK_BADGE_STYLES[agency.rank])}
                        >
                          {AGENCY_RANK_LABELS[agency.rank as AgencyRank]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {agency.parent_agencies.length > 0
                        ? agency.parent_agencies
                            .map((p) => p.parent_name)
                            .join(", ")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(agency.commission_rate * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {new Date(agency.created_at).toLocaleDateString("ja-JP")}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = getOnboardingStatus(agency);
                        const tooltip = getOnboardingTooltip(agency);
                        const badge = (
                          <Badge
                            variant="outline"
                            className={cn("border-transparent", ONBOARDING_BADGE_STYLES[status])}
                          >
                            {ONBOARDING_LABELS[status]}
                          </Badge>
                        );
                        return tooltip ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default">{badge}</span>
                            </TooltipTrigger>
                            <TooltipContent>{tooltip}</TooltipContent>
                          </Tooltip>
                        ) : (
                          badge
                        );
                      })()}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="cursor-pointer p-2.5 -m-1.5 text-primary hover:text-primary/70 transition-colors"
                            onClick={() => onSelect(agency)}
                            aria-label="編集"
                          >
                            <Pencil className="size-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>編集</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </TooltipProvider>
  );
}
