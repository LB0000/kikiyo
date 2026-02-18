"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil } from "lucide-react";
import { AGENCY_RANK_LABELS } from "@/lib/constants";
import type { AgencyWithHierarchy } from "@/lib/actions/agencies";
import type { AgencyRank } from "@/lib/supabase/types";

type Props = {
  agencies: AgencyWithHierarchy[];
  onSelect: (agency: AgencyWithHierarchy) => void;
};

export function AgenciesTable({ agencies, onSelect }: Props) {
  return (
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
              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                データがありません
              </TableCell>
            </TableRow>
          ) : (
            agencies.map((agency) => (
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
                    className="p-1 text-pink-400 hover:text-pink-600 transition-colors"
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
  );
}
