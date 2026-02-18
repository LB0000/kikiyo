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
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { exportCsv, type CsvColumn } from "@/lib/csv-export";

type CsvDataRow = {
  id: string;
  creator_nickname: string | null;
  handle: string | null;
  creator_id: string | null;
  group: string | null;
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

const EXPORT_COLUMNS: CsvColumn<CsvDataRow>[] = [
  { header: "データ月", accessor: (r) => r.data_month },
  { header: "ニックネーム", accessor: (r) => r.creator_nickname },
  { header: "ハンドル", accessor: (r) => r.handle },
  { header: "クリエイターID", accessor: (r) => r.creator_id },
  { header: "グループ", accessor: (r) => r.group },
  { header: "ダイヤモンド", accessor: (r) => r.diamonds },
  { header: "有効日数", accessor: (r) => r.valid_days },
  { header: "有効時間", accessor: (r) => r.live_duration },
  { header: "推定ボーナス", accessor: (r) => r.estimated_bonus },
];

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function DataTable({ rows }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        データがありません
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            exportCsv(rows, EXPORT_COLUMNS, `data_${new Date().toISOString().slice(0, 10)}.csv`)
          }
        >
          <Download className="size-4" />
          CSVエクスポート
        </Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>データ月</TableHead>
              <TableHead>ニックネーム</TableHead>
              <TableHead>ハンドル</TableHead>
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
                <TableCell>{row.creator_nickname ?? "-"}</TableCell>
                <TableCell>{row.handle ?? "-"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {row.creator_id ?? "-"}
                </TableCell>
                <TableCell>{row.group ?? "-"}</TableCell>
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
        currentPage={safePage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
