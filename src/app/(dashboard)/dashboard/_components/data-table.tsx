"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Database, Download } from "lucide-react";
import { Pagination } from "@/components/shared/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { exportCsv, type CsvColumn } from "@/lib/csv-export";

type CsvDataRow = {
  id: string;
  creator_nickname: string | null;
  handle: string | null;
  creator_id: string | null;
  group: string | null;
  creator_network_manager: string | null;
  diamonds: number;
  estimated_bonus: number;
  total_reward_jpy: number;
  agency_reward_jpy: number;
  data_month: string | null;
  live_duration: string | null;
  valid_days: string | null;
  liver_id: string | null;
  bonus_rookie_half_milestone: number;
  bonus_rookie_milestone_1: number;
  bonus_rookie_retention: number;
  bonus_rookie_milestone_2: number;
  bonus_activeness: number;
  bonus_off_platform: number;
  bonus_revenue_scale: number;
};

type Props = {
  rows: CsvDataRow[];
  livers: { id: string; name: string | null }[];
};

const PAGE_SIZE = 10;

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

function fmtBonus(n: number): string {
  if (n === 0) return "-";
  return n.toLocaleString("ja-JP", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function DataTable({ rows, livers }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const liverMap = useMemo(
    () => new Map(livers.map((l) => [l.id, l.name])),
    [livers]
  );

  const exportColumns: CsvColumn<CsvDataRow>[] = useMemo(
    () => [
      { header: "データ月", accessor: (r) => r.data_month },
      { header: "本名", accessor: (r) => (r.liver_id ? liverMap.get(r.liver_id) ?? "-" : "-") },
      { header: "TikTokユーザー名", accessor: (r) => r.handle },
      { header: "クリエイターのニックネーム", accessor: (r) => r.creator_nickname },
      { header: "クリエイターID", accessor: (r) => r.creator_id },
      { header: "グループ", accessor: (r) => r.creator_network_manager },
      { header: "ダイヤモンド", accessor: (r) => r.diamonds },
      { header: "有効日数", accessor: (r) => r.valid_days },
      { header: "有効時間", accessor: (r) => r.live_duration },
      { header: "推定ボーナス", accessor: (r) => r.estimated_bonus },
      { header: "ルーキーM0.5", accessor: (r) => r.bonus_rookie_half_milestone },
      { header: "ルーキーM1R", accessor: (r) => r.bonus_rookie_milestone_1 },
      { header: "ルーキーM１", accessor: (r) => r.bonus_rookie_retention },
      { header: "ルーキーM２", accessor: (r) => r.bonus_rookie_milestone_2 },
      { header: "アクティブタスク", accessor: (r) => r.bonus_activeness },
      { header: "新優良クリエイタータスク", accessor: (r) => r.bonus_off_platform },
      { header: "収益スケール", accessor: (r) => r.bonus_revenue_scale },
    ],
    [liverMap]
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60">
        <EmptyState
          icon={Database}
          title="データがありません"
          description="CSVファイルをアップロードしてください"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() =>
            exportCsv(rows, exportColumns, `data_${new Date().toISOString().slice(0, 10)}.csv`)
          }
        >
          <Download className="size-3.5" />
          CSVエクスポート
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border/60 shadow-[var(--card-shadow)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>データ月</TableHead>
              <TableHead>本名</TableHead>
              <TableHead>TikTokユーザー名</TableHead>
              <TableHead>クリエイターのニックネーム</TableHead>
              <TableHead>クリエイターID</TableHead>
              <TableHead>グループ</TableHead>
              <TableHead className="text-right">ダイヤモンド</TableHead>
              <TableHead className="text-right">有効日数</TableHead>
              <TableHead className="text-right">有効時間</TableHead>
              <TableHead className="text-right">推定ボーナス</TableHead>
              <TableHead className="text-right">ルーキーM0.5</TableHead>
              <TableHead className="text-right">ルーキーM1R</TableHead>
              <TableHead className="text-right">ルーキーM１</TableHead>
              <TableHead className="text-right">ルーキーM２</TableHead>
              <TableHead className="text-right">アクティブタスク</TableHead>
              <TableHead className="text-right">新優良クリエイタータスク</TableHead>
              <TableHead className="text-right">収益スケール</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.data_month ?? "-"}</TableCell>
                <TableCell>{row.liver_id ? liverMap.get(row.liver_id) ?? "-" : "-"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.handle ?? "-"}
                </TableCell>
                <TableCell>{row.creator_nickname ?? "-"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {row.creator_id ?? "-"}
                </TableCell>
                <TableCell>{row.creator_network_manager ?? "-"}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(row.diamonds)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.valid_days ?? "0"}</TableCell>
                <TableCell className="text-right tabular-nums">{row.live_duration ?? "0"}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBonus(row.estimated_bonus)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBonus(row.bonus_rookie_half_milestone)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBonus(row.bonus_rookie_milestone_1)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBonus(row.bonus_rookie_retention)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBonus(row.bonus_rookie_milestone_2)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBonus(row.bonus_activeness)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBonus(row.bonus_off_platform)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmtBonus(row.bonus_revenue_scale)}</TableCell>
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
