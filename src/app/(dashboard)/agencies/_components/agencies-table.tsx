"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
            <TableHead>ランク</TableHead>
            <TableHead>手数料率</TableHead>
            <TableHead>上位代理店</TableHead>
            <TableHead>登録日</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {agencies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                データがありません
              </TableCell>
            </TableRow>
          ) : (
            agencies.map((agency) => (
              <TableRow
                key={agency.id}
                className="cursor-pointer"
                onClick={() => onSelect(agency)}
              >
                <TableCell className="font-medium">{agency.name}</TableCell>
                <TableCell>
                  {agency.rank ? (
                    <Badge variant="secondary">
                      {AGENCY_RANK_LABELS[agency.rank as AgencyRank]}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {(agency.commission_rate * 100).toFixed(1)}%
                </TableCell>
                <TableCell>
                  {agency.parent_agencies.length > 0
                    ? agency.parent_agencies
                        .map((p) => p.parent_name)
                        .join(", ")
                    : "-"}
                </TableCell>
                <TableCell>
                  {new Date(agency.created_at).toLocaleDateString("ja-JP")}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
