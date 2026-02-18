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
import { Building2, Pencil } from "lucide-react";
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

export function AgenciesTable({ agencies, onSelect }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(agencies.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedAgencies = agencies.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>代理店名</TableHead>
              <TableHead>代理店ランク</TableHead>
              <TableHead>上位代理店</TableHead>
              <TableHead>手数料率</TableHead>
              <TableHead>メールアドレス</TableHead>
              <TableHead>提携日</TableHead>
              <TableHead className="w-10" />
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
                <TableRow key={agency.id}>
                  <TableCell className="font-medium">{agency.name}</TableCell>
                  <TableCell>
                    {agency.rank
                      ? AGENCY_RANK_LABELS[agency.rank as AgencyRank]
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {agency.parent_agencies.length > 0
                      ? agency.parent_agencies
                          .map((p) => p.parent_name)
                          .join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {(agency.commission_rate * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-sm">-</TableCell>
                  <TableCell>
                    {new Date(agency.created_at).toLocaleDateString("ja-JP")}
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="cursor-pointer p-2.5 -m-1.5 text-primary hover:text-primary/70 transition-colors"
                      onClick={() => onSelect(agency)}
                      aria-label="編集"
                    >
                      <Pencil className="size-4" />
                    </button>
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
  );
}
