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
import { Pagination } from "@/components/shared/pagination";

type CsvDataRow = {
  id: string;
  creator_nickname: string | null;
  handle: string | null;
  creator_id: string | null;
  diamonds: number;
  estimated_bonus: number;
  total_reward_jpy: number;
  agency_reward_jpy: number;
  data_month: string | null;
  live_duration: string | null;
  valid_days: string | null;
};

type Props = {
  rows: CsvDataRow[];
};

const PAGE_SIZE = 10;

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function DataTable({ rows }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>データ月</TableHead>
              <TableHead>本名</TableHead>
              <TableHead>ニックネーム</TableHead>
              <TableHead>クリエイターID</TableHead>
              <TableHead>グループ</TableHead>
              <TableHead className="text-right">ダイヤモンド</TableHead>
              <TableHead className="text-right">有効日数</TableHead>
              <TableHead className="text-right">有効時間</TableHead>
              <TableHead className="text-right">推定ボーナス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.data_month ?? "-"}</TableCell>
                <TableCell>{row.handle ?? "-"}</TableCell>
                <TableCell>{row.creator_nickname ?? "-"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {row.creator_id ?? "-"}
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell className="text-right">{fmt(row.diamonds)}</TableCell>
                <TableCell className="text-right">{row.valid_days ?? "0"}</TableCell>
                <TableCell className="text-right">{row.live_duration ?? "0"}</TableCell>
                <TableCell className="text-right">
                  {fmt(row.estimated_bonus)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
