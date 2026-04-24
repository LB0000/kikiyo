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
  payment_bonus: number;
  total_reward_jpy: number;
  agency_reward_jpy: number;
  data_month: string | null;
  live_duration: string | null;
  valid_days: string | null;
  liver_id: string | null;
  // 旧ルール（〜2026.2）
  bonus_rookie_half_milestone: number;
  bonus_rookie_milestone_1: number;
  bonus_rookie_retention: number;
  bonus_rookie_milestone_2: number;
  bonus_activeness: number;
  bonus_off_platform: number;
  bonus_revenue_scale: number;
  // 新ルール（2026.3〜）
  bonus_ranked_up: number;
  bonus_maintained_tiers: number;
  bonus_off_platform_2026_03: number;
  bonus_incremental_revenue: number;
};

type Props = {
  rows: CsvDataRow[];
  livers: { id: string; name: string | null; account_name: string | null; tiktok_username: string | null; liver_id: string | null; agency_id: string | null }[];
  isAdmin: boolean;
};

const PAGE_SIZE = 10;

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

function fmtBonus(n: number): string {
  if (n === 0) return "-";
  return n.toLocaleString("ja-JP", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

/**
 * レポートが新ルール（2026.3〜）か旧ルール（〜2026.2）かを行データから推測。
 * payment_bonus は両方で埋まる（旧はバックフィル）ため、新ルール特有の列で判定する。
 */
function detectIsNewRule(rows: CsvDataRow[]): boolean {
  return rows.some(
    (r) =>
      r.bonus_ranked_up > 0 ||
      r.bonus_maintained_tiers > 0 ||
      r.bonus_off_platform_2026_03 > 0 ||
      r.bonus_incremental_revenue > 0
  );
}

export function DataTable({ rows, livers, isAdmin }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const liverMap = useMemo(
    () => new Map(livers.map((l) => [l.id, l.name])),
    [livers]
  );

  const isNewRule = useMemo(() => detectIsNewRule(rows), [rows]);

  // 画面に描画する列定義。adminOnly の列は代理店ユーザーには非表示。
  // legacy=true は旧ルールの列（〜2026.2）で、新ルールレポートでは非表示。
  type ColDef = {
    key: string;
    header: string;
    cell: (r: CsvDataRow) => React.ReactNode;
    exportValue: (r: CsvDataRow) => string | number | null;
    align?: "right";
    adminOnly?: boolean;
    legacy?: boolean;
    /** 新ルールでのみ表示する列 */
    newOnly?: boolean;
  };

  const allColumns: ColDef[] = useMemo(
    () => [
      {
        key: "data_month",
        header: "データ月",
        cell: (r) => r.data_month ?? "-",
        exportValue: (r) => r.data_month,
      },
      {
        key: "name",
        header: "氏名",
        cell: (r) => (r.liver_id ? liverMap.get(r.liver_id) ?? "-" : "-"),
        exportValue: (r) => (r.liver_id ? liverMap.get(r.liver_id) ?? "-" : "-"),
      },
      {
        key: "handle",
        header: "TikTokユーザー名",
        cell: (r) => (
          <span className="font-mono text-xs text-muted-foreground">{r.handle ?? "-"}</span>
        ),
        exportValue: (r) => r.handle,
      },
      {
        key: "creator_nickname",
        header: "ニックネーム",
        cell: (r) => r.creator_nickname ?? "-",
        exportValue: (r) => r.creator_nickname,
      },
      {
        key: "creator_id",
        header: "クリエイターID",
        cell: (r) => (
          <span className="font-mono text-xs text-muted-foreground">{r.creator_id ?? "-"}</span>
        ),
        exportValue: (r) => r.creator_id,
      },
      {
        key: "group",
        header: "グループ",
        cell: (r) => r.creator_network_manager ?? "-",
        exportValue: (r) => r.creator_network_manager,
      },
      {
        key: "diamonds",
        header: "ダイヤモンド",
        cell: (r) => fmt(r.diamonds),
        exportValue: (r) => r.diamonds,
        align: "right",
      },
      {
        key: "valid_days",
        header: "有効日数",
        cell: (r) => r.valid_days ?? "0",
        exportValue: (r) => r.valid_days,
        align: "right",
      },
      {
        key: "live_duration",
        header: "有効時間",
        cell: (r) => r.live_duration ?? "0",
        exportValue: (r) => r.live_duration,
        align: "right",
      },

      // --- 新ルール（2026.3〜）の①〜⑤ ---
      {
        key: "bonus_ranked_up",
        header: "ランクアップ",
        cell: (r) => fmtBonus(r.bonus_ranked_up),
        exportValue: (r) => r.bonus_ranked_up,
        align: "right",
        newOnly: true,
      },
      {
        key: "bonus_maintained_tiers",
        header: "ランク維持",
        cell: (r) => fmtBonus(r.bonus_maintained_tiers),
        exportValue: (r) => r.bonus_maintained_tiers,
        align: "right",
        newOnly: true,
      },
      {
        key: "bonus_activeness",
        header: "アクティブ度",
        cell: (r) => fmtBonus(r.bonus_activeness),
        exportValue: (r) => r.bonus_activeness,
        align: "right",
      },
      {
        key: "bonus_off_platform",
        header: "新優良クリエイタータスク",
        cell: (r) => fmtBonus(r.bonus_off_platform),
        exportValue: (r) => r.bonus_off_platform,
        align: "right",
      },
      {
        key: "bonus_off_platform_2026_03",
        header: "他社プラットフォーム",
        cell: (r) => fmtBonus(r.bonus_off_platform_2026_03),
        exportValue: (r) => r.bonus_off_platform_2026_03,
        align: "right",
        newOnly: true,
      },

      // --- 支払対象ボーナス（最重要・両ルール共通）---
      {
        key: "payment_bonus",
        header: "推定ボーナス(支払)",
        cell: (r) => (
          <span className="font-semibold">{fmtBonus(r.payment_bonus)}</span>
        ),
        exportValue: (r) => r.payment_bonus,
        align: "right",
      },

      // --- 管理者のみ（社内参照用） ---
      {
        key: "bonus_incremental_revenue",
        header: "売上増加",
        cell: (r) => fmtBonus(r.bonus_incremental_revenue),
        exportValue: (r) => r.bonus_incremental_revenue,
        align: "right",
        adminOnly: true,
        newOnly: true,
      },
      {
        key: "estimated_bonus",
        header: "推定ボーナス(元値)",
        cell: (r) => fmtBonus(r.estimated_bonus),
        exportValue: (r) => r.estimated_bonus,
        align: "right",
        adminOnly: true,
      },

      // --- 旧ルール列（〜2026.2） ---
      {
        key: "bonus_rookie_half_milestone",
        header: "ルーキーM0.5",
        cell: (r) => fmtBonus(r.bonus_rookie_half_milestone),
        exportValue: (r) => r.bonus_rookie_half_milestone,
        align: "right",
        legacy: true,
      },
      {
        key: "bonus_rookie_milestone_1",
        header: "ルーキーM1R",
        cell: (r) => fmtBonus(r.bonus_rookie_milestone_1),
        exportValue: (r) => r.bonus_rookie_milestone_1,
        align: "right",
        legacy: true,
      },
      {
        key: "bonus_rookie_retention",
        header: "ルーキーM１",
        cell: (r) => fmtBonus(r.bonus_rookie_retention),
        exportValue: (r) => r.bonus_rookie_retention,
        align: "right",
        legacy: true,
      },
      {
        key: "bonus_rookie_milestone_2",
        header: "ルーキーM２",
        cell: (r) => fmtBonus(r.bonus_rookie_milestone_2),
        exportValue: (r) => r.bonus_rookie_milestone_2,
        align: "right",
        legacy: true,
      },
      {
        key: "bonus_revenue_scale",
        header: "収益スケール",
        cell: (r) => fmtBonus(r.bonus_revenue_scale),
        exportValue: (r) => r.bonus_revenue_scale,
        align: "right",
        legacy: true,
      },
    ],
    [liverMap]
  );

  const visibleColumns: ColDef[] = useMemo(() => {
    return allColumns.filter((c) => {
      if (c.adminOnly && !isAdmin) return false;
      // 新ルール専用列は旧レポートでは隠す
      if (c.newOnly && !isNewRule) return false;
      // 旧ルール列は新ルールレポートでは隠す
      if (c.legacy && isNewRule) return false;
      return true;
    });
  }, [allColumns, isAdmin, isNewRule]);

  const exportColumns: CsvColumn<CsvDataRow>[] = useMemo(
    () =>
      visibleColumns.map((c) => ({
        header: c.header,
        accessor: c.exportValue,
      })),
    [visibleColumns]
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
              {visibleColumns.map((c) => (
                <TableHead
                  key={c.key}
                  className={c.align === "right" ? "text-right" : undefined}
                >
                  {c.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.map((row) => (
              <TableRow key={row.id}>
                {visibleColumns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={
                      c.align === "right"
                        ? "text-right tabular-nums"
                        : undefined
                    }
                  >
                    {c.cell(row)}
                  </TableCell>
                ))}
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
